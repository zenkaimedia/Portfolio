"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import type { Project } from "@/lib/types";
import { transformImage } from "@/lib/image";
import {
  updateProjectAction,
  deleteProjectAction,
  bulkDeleteProjectsAction,
  renameFolderAction,
  deleteFolderAction,
  reorderItemsAction,
  reorderFoldersAction,
  moveItemsAction,
  copyItemsAction,
} from "../actions";

const inputCls = "w-full rounded-xl border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/50";
type ViewMode = "grid" | "list";
type NavState = { level: "folders" } | { level: "items"; category: string };
type ClipboardState = { items: Project[]; op: "cut" | "copy" } | null;
type CtxTarget =
  | { kind: "bg" }
  | { kind: "folder"; category: string; count: number }
  | { kind: "item"; project: Project }
  | { kind: "selection"; count: number };

/* ── Drag hook ───────────────────────────────────────────────────────────── */
function useDrag<T>(
  items: T[], getKey: (t: T) => string, onReorder: (n: T[]) => void, axis: "x" | "y" = "x"
) {
  const dragKey = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ key: string; side: "before" | "after" } | null>(null);

  function handleStart(key: string, e: React.DragEvent) {
    dragKey.current = key; e.dataTransfer.effectAllowed = "move";
    requestAnimationFrame(() => setDragging(key));
  }
  function handleOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    if (!dragKey.current || dragKey.current === key) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const side: "before" | "after" = axis === "x"
      ? (e.clientX < rect.left + rect.width / 2 ? "before" : "after")
      : (e.clientY < rect.top + rect.height / 2 ? "before" : "after");
    setOver((p) => (p?.key === key && p.side === side ? p : { key, side }));
  }
  function handleDrop(e: React.DragEvent, key: string) {
    e.preventDefault();
    const from = dragKey.current; const side = over?.side ?? "after";
    setDragging(null); dragKey.current = null; setOver(null);
    if (!from || from === key) return;
    const next = [...items];
    const fi = next.findIndex((t) => getKey(t) === from);
    if (fi === -1) return;
    const [moved] = next.splice(fi, 1);
    const ti = next.findIndex((t) => getKey(t) === key);
    if (ti === -1) return;
    next.splice(side === "after" ? ti + 1 : ti, 0, moved);
    onReorder(next);
  }
  function handleEnd() { setDragging(null); dragKey.current = null; setOver(null); }
  return { dragging, over, handleStart, handleOver, handleDrop, handleEnd };
}

/* ── Auto-scroll during drag ─────────────────────────────────────────────── */
function useAutoScroll(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const EDGE = 80;    // px from edge to start scrolling
    const MAX = 16;     // max px per frame
    let dir = 0;
    let speed = 0;
    let frame: number;

    function onDragOver(e: DragEvent) {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (e.clientY < rect.top + EDGE) {
        dir = -1;
        speed = Math.round(MAX * (1 - (e.clientY - rect.top) / EDGE));
      } else if (e.clientY > rect.bottom - EDGE) {
        dir = 1;
        speed = Math.round(MAX * (1 - (rect.bottom - e.clientY) / EDGE));
      } else {
        dir = 0;
        speed = 0;
      }
    }

    function tick() {
      if (dir !== 0 && ref.current) ref.current.scrollTop += dir * speed;
      frame = requestAnimationFrame(tick);
    }

    document.addEventListener("dragover", onDragOver);
    frame = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      cancelAnimationFrame(frame);
    };
  }, [active, ref]);
}

/* ── Insert bar ──────────────────────────────────────────────────────────── */
function InsertBar({ side, axis }: { side: "before" | "after"; axis: "x" | "y" }) {
  const h = axis === "x";
  return (
    <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.1 }}
      className={`pointer-events-none absolute z-30 flex items-center ${h ? (side === "before" ? "-left-[3px] inset-y-1 flex-col w-[6px]" : "-right-[3px] inset-y-1 flex-col w-[6px]") : (side === "before" ? "-top-[3px] inset-x-1 flex-row h-[6px]" : "-bottom-[3px] inset-x-1 flex-row h-[6px]")}`}
    >
      <span className={`shrink-0 rounded-full bg-gold ${h ? "w-2 h-2" : "h-2 w-2"}`} style={{ boxShadow: "0 0 6px var(--color-gold)" }} />
      <span className={`flex-1 rounded-full bg-gold ${h ? "w-[2px]" : "h-[2px]"}`} style={{ boxShadow: "0 0 6px var(--color-gold)" }} />
    </motion.div>
  );
}

/* ── Context menu ────────────────────────────────────────────────────────── */
type MenuItem = { label: string; shortcut?: string; icon?: string; danger?: boolean; separator?: boolean; disabled?: boolean; onClick: () => void };

function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  // Clamp to viewport
  const style: React.CSSProperties = { position: "fixed", zIndex: 999, left: Math.min(x, window.innerWidth - 230), top: Math.min(y, window.innerHeight - items.length * 36 - 16) };

  return (
    <motion.div ref={ref} style={style} initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
      className="w-56 rounded-xl border border-line bg-ink-2/95 py-1.5 shadow-2xl backdrop-blur-sm"
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="my-1 h-px bg-line/60" />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { item.onClick(); onClose(); }}
            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors disabled:opacity-30 ${item.danger ? "text-ember hover:bg-ember/10" : "text-bone hover:bg-white/[0.06]"}`}
          >
            {item.icon && <span className="w-4 text-center text-base">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="font-mono text-[10px] text-muted">{item.shortcut}</span>}
          </button>
        )
      )}
    </motion.div>
  );
}

/* ── Move-to dialog ──────────────────────────────────────────────────────── */
function MoveToDialog({
  folders, onConfirm, onClose,
}: { folders: string[]; onConfirm: (cat: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const filtered = folders.filter((f) => f.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-ink-2 p-5 shadow-2xl">
        <h3 className="mb-4 font-display text-base font-bold text-bone">Move to folder</h3>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search folders…" className={`${inputCls} mb-3 py-2 text-sm`} autoFocus />
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {filtered.map((f) => (
            <button key={f} onClick={() => onConfirm(f)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-bone transition-colors hover:bg-white/5">
              <span>📁</span>{f}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 font-mono text-xs text-muted">No folders found</p>}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Edit modal ──────────────────────────────────────────────────────────── */
function EditModal({ project, categories, subcategories, onSave, onClose, busy }: {
  project: Project; categories: string[]; subcategories: string[];
  onSave: (v: { id: string; title: string; category: string; subcategory: string; description: string }) => void;
  onClose: () => void; busy: boolean;
}) {
  const [title, setTitle] = useState(project.title);
  const [category, setCategory] = useState(project.category);
  const [subcategory, setSubcategory] = useState(project.subcategory ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-ink-2 p-6 shadow-2xl">
        <h3 className="mb-5 font-display text-lg font-bold text-bone">Edit Project</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} list="m-cats" className={inputCls} />
              <datalist id="m-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Subcategory</label>
              <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} list="m-subs" className={inputCls} />
              <datalist id="m-subs">{subcategories.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={() => onSave({ id: project.id, title, category, subcategory, description })} disabled={busy || !title.trim()} className="rounded-full border border-gold/40 bg-gold/10 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-40">{busy ? "Saving…" : "Save"}</button>
          <button onClick={onClose} className="font-mono text-xs uppercase tracking-[0.2em] text-muted hover:text-bone">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── New folder inline input ─────────────────────────────────────────────── */
function NewFolderCard({ onConfirm, onCancel }: { onConfirm: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gold/40 bg-ink-2/40 p-4">
      <span className="text-2xl">📁</span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onConfirm(name.trim()); if (e.key === "Escape") onCancel(); }}
        placeholder="Folder name…"
        className="w-full rounded-lg border border-gold/40 bg-ink px-3 py-2 text-center text-sm text-bone outline-none focus:border-gold"
        autoFocus
      />
      <div className="flex gap-2">
        <button onClick={() => name.trim() && onConfirm(name.trim())} className="font-mono text-[11px] text-gold hover:text-gold/80">Create</button>
        <button onClick={onCancel} className="font-mono text-[11px] text-muted hover:text-bone">Cancel</button>
      </div>
    </div>
  );
}

/* ── Folder card ─────────────────────────────────────────────────────────── */
function FolderCard({ name, count, imageUrl, isDragging, overSide, hasPaste, isDropTarget,
  onDragStart, onDragOver, onDrop, onDragEnd, onClick, onContext }: {
  name: string; count: number; imageUrl?: string; isDragging: boolean;
  overSide: "before" | "after" | null; hasPaste: boolean; isDropTarget: boolean;
  onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void; onDragEnd: () => void;
  onClick: () => void; onContext: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      onClick={onClick} onContextMenu={onContext}
      className={`group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl bg-panel transition-all duration-200 ${isDragging ? "opacity-40 scale-95" : "shadow-md hover:shadow-xl"} ${isDropTarget ? "ring-2 ring-gold" : ""}`}
    >
      {imageUrl && <img src={transformImage(imageUrl, 400, 75)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      {overSide && <InsertBar side={overSide} axis="x" />}
      {hasPaste && <div className="absolute left-2 top-2 rounded bg-gold/80 px-2 py-0.5 font-mono text-[9px] text-ink">PASTE HERE</div>}
      <div className="absolute left-2 top-2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        <span className="rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] text-muted backdrop-blur">⠿</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="truncate font-display text-base font-bold text-white">{name}</h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{count} {count === 1 ? "item" : "items"}</p>
      </div>
    </div>
  );
}

/* ── Item card ───────────────────────────────────────────────────────────── */
function ItemCard({ project, isDragging, overSide, isSelected, isCut,
  onDragStart, onDragOver, onDrop, onDragEnd, onClick, onContext }: {
  project: Project; isDragging: boolean; overSide: "before" | "after" | null;
  isSelected: boolean; isCut: boolean;
  onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void; onDragEnd: () => void;
  onClick: (e: React.MouseEvent) => void; onContext: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      onClick={onClick} onContextMenu={onContext}
      className={`group relative aspect-[4/3] overflow-hidden rounded-xl bg-black transition-all duration-200 ${isDragging ? "opacity-40 scale-95" : "shadow-md"} ${isSelected ? "ring-2 ring-gold" : ""} ${isCut ? "opacity-50" : ""}`}
    >
      {overSide && <InsertBar side={overSide} axis="x" />}
      {project.type === "image" && <img src={transformImage(project.media, 300, 75)} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />}
      {project.type === "video" && <video src={project.media} muted playsInline preload="metadata" onLoadedMetadata={(e) => { try { e.currentTarget.currentTime = 0.1; } catch { /**/ } }} className="h-full w-full object-cover" />}
      {(project.type === "pdf" || project.type === "website") && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-panel/80">
          <span className="text-xl">{project.type === "pdf" ? "📄" : "🌐"}</span>
          <span className="font-mono text-[9px] uppercase text-muted">{project.type}</span>
        </div>
      )}
      {/* Selection checkbox */}
      <div className={`absolute left-2 top-2 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} onClick={(e) => { e.stopPropagation(); onClick(e); }}>
        <span className={`grid h-5 w-5 place-items-center rounded border ${isSelected ? "border-gold bg-gold text-ink" : "border-white/60 bg-black/50"}`}>
          {isSelected && "✓"}
        </span>
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
        <p className="truncate px-3 pb-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white">{project.title}</p>
      </div>
    </div>
  );
}

/* ── Item list row ───────────────────────────────────────────────────────── */
function ItemRow({ project, isDragging, overSide, isSelected, isCut,
  onDragStart, onDragOver, onDrop, onDragEnd, onClick, onContext }: {
  project: Project; isDragging: boolean; overSide: "before" | "after" | null;
  isSelected: boolean; isCut: boolean;
  onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void; onDragEnd: () => void;
  onClick: (e: React.MouseEvent) => void; onContext: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      onClick={onClick} onContextMenu={onContext}
      className={`group relative flex cursor-pointer items-center gap-3 border-b border-line/60 px-4 py-3 transition-all hover:bg-white/[0.02] ${isDragging ? "opacity-40" : ""} ${isSelected ? "bg-gold/5" : ""} ${isCut ? "opacity-50" : ""}`}
    >
      {overSide && <InsertBar side={overSide} axis="y" />}
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${isSelected ? "border-gold bg-gold text-ink" : "border-line group-hover:border-muted/60"}`}>{isSelected && "✓"}</span>
      <span className="cursor-grab select-none font-mono text-[14px] text-muted/40 hover:text-muted">⠿</span>
      <span className="grid h-8 w-12 shrink-0 place-items-center overflow-hidden rounded border border-line bg-black">
        {project.type === "image" ? <img src={transformImage(project.media, 80, 70)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="font-mono text-[7px] uppercase text-muted">{project.type.slice(0, 3).toUpperCase()}</span>}
      </span>
      <span className="flex-1 truncate text-sm text-bone">{project.title}</span>
      {project.subcategory && <span className="hidden rounded-full border border-line px-2 py-0.5 font-mono text-[9px] text-muted sm:inline">{project.subcategory}</span>}
      <span className="hidden font-mono text-[9px] uppercase text-muted/60 md:block">{project.type}</span>
    </div>
  );
}

/* ── Folder view ─────────────────────────────────────────────────────────── */
function FolderView({ projects, folderOrder, viewMode, clipboard, onNavigate, onProjectsChange, onPasteInto, onClearClipboard }: {
  projects: Project[]; folderOrder: Record<string, number>; viewMode: ViewMode;
  clipboard: ClipboardState;
  onNavigate: (cat: string) => void;
  onProjectsChange: (p: Project[]) => void;
  onPasteInto: (cat: string) => void;
  onClearClipboard: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; target: CtxTarget } | null>(null);
  const [newFolder, setNewFolder] = useState(false);

  const MAX = Number.MAX_SAFE_INTEGER;
  const catMap = new Map<string, Project[]>();
  for (const p of projects) {
    if (!catMap.has(p.category)) catMap.set(p.category, []);
    catMap.get(p.category)!.push(p);
  }
  const [folders, setFolders] = useState(() =>
    [...catMap.keys()].sort((a, b) => {
      const pa = folderOrder[a] ?? MAX, pb = folderOrder[b] ?? MAX;
      return pa !== pb ? pa - pb : a.localeCompare(b);
    })
  );
  // Add empty local folders not in catMap
  const [localFolders, setLocalFolders] = useState<string[]>([]);
  const allFolders = [...folders, ...localFolders.filter((f) => !folders.includes(f))];

  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useDrag(folders, (f) => f, async (next) => {
    setFolders(next);
    const res = await reorderFoldersAction(next);
    if ("error" in res) setMsg(res.error);
    else startTransition(() => router.refresh());
  }, viewMode === "list" ? "y" : "x");
  useAutoScroll(scrollRef, drag.dragging !== null);

  function openCtx(e: React.MouseEvent, target: CtxTarget) {
    e.preventDefault(); e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, target });
  }

  function getCtxItems(): MenuItem[] {
    if (!ctx) return [];
    const t = ctx.target;
    if (t.kind === "bg") return [
      { label: "New Folder", icon: "📁", onClick: () => setNewFolder(true) },
      ...(clipboard ? [{ separator: true } as MenuItem, { label: `Paste (${clipboard.items.length})`, icon: "📋", shortcut: "⌘V", onClick: () => { /* paste needs folder */ }, disabled: true }] : []),
    ];
    if (t.kind === "folder") return [
      { label: "Open", icon: "📂", onClick: () => onNavigate(t.category) },
      ...(clipboard ? [{ label: `Paste into "${t.category}"`, icon: "📋", shortcut: "⌘V", onClick: () => onPasteInto(t.category) }] : []),
      { separator: true } as MenuItem,
      { label: "Rename", icon: "✏️", onClick: () => { setRenaming(t.category); setRenameVal(t.category); } },
      { label: "Delete Folder", icon: "🗑", danger: true, onClick: () => doDelete(t.category, t.count) },
    ];
    return [];
  }

  async function doRename(category: string) {
    if (!renameVal.trim()) return;
    const res = await renameFolderAction({ category, subcategory: null, newName: renameVal.trim() });
    if ("error" in res) { setMsg(res.error); return; }
    setRenaming(null); startTransition(() => router.refresh());
  }

  async function doDelete(category: string, count: number) {
    if (!confirm(`Delete "${category}" and all ${count} item(s)?`)) return;
    const res = await deleteFolderAction({ category, subcategory: null });
    if ("error" in res) { setMsg(res.error); return; }
    onProjectsChange(projects.filter((p) => p.category !== category));
    setFolders((prev) => prev.filter((f) => f !== category));
    startTransition(() => router.refresh());
  }

  const firstImg = (cat: string) => catMap.get(cat)?.find((p) => p.type === "image")?.media;

  if (viewMode === "grid") {
    return (
      <div ref={scrollRef} className="flex-1 overflow-y-auto" onContextMenu={(e) => { if (e.target === e.currentTarget) openCtx(e, { kind: "bg" }); }}>
        {msg && <p className="mb-3 font-mono text-xs text-ember">{msg}</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" onContextMenu={(e) => openCtx(e, { kind: "bg" })}>
          {allFolders.map((cat) =>
            renaming === cat ? (
              <motion.div key={cat} layout className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl border border-gold/30 bg-ink-2/60 p-4">
                <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doRename(cat); if (e.key === "Escape") setRenaming(null); }} className="w-full rounded-lg border border-gold/40 bg-ink px-3 py-2 text-sm text-bone outline-none" autoFocus />
                <div className="flex gap-2"><button onClick={() => doRename(cat)} className="font-mono text-[11px] text-gold">Save</button><button onClick={() => setRenaming(null)} className="font-mono text-[11px] text-muted">Cancel</button></div>
              </motion.div>
            ) : (
              <motion.div key={cat} layout transition={{ type: "spring", stiffness: 400, damping: 35 }}>
                <FolderCard
                  name={cat} count={catMap.get(cat)?.length ?? 0} imageUrl={firstImg(cat)}
                  isDragging={drag.dragging === cat} overSide={drag.over?.key === cat ? drag.over.side : null}
                  hasPaste={false} isDropTarget={false}
                  onDragStart={(e) => drag.handleStart(cat, e)} onDragOver={(e) => drag.handleOver(e, cat)}
                  onDrop={(e) => drag.handleDrop(e, cat)} onDragEnd={drag.handleEnd}
                  onClick={() => onNavigate(cat)}
                  onContext={(e) => openCtx(e, { kind: "folder", category: cat, count: catMap.get(cat)?.length ?? 0 })}
                />
              </motion.div>
            )
          )}
          {newFolder && (
            <NewFolderCard
              onConfirm={(name) => { setLocalFolders((prev) => [...prev, name]); setNewFolder(false); onNavigate(name); }}
              onCancel={() => setNewFolder(false)}
            />
          )}
        </div>
        <AnimatePresence>{ctx && <ContextMenu x={ctx.x} y={ctx.y} items={getCtxItems()} onClose={() => setCtx(null)} />}</AnimatePresence>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2" onContextMenu={(e) => openCtx(e, { kind: "bg" })}>
      {msg && <p className="font-mono text-xs text-ember">{msg}</p>}
      {newFolder && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-gold/40 bg-ink-2/40 px-4 py-3">
          <span>📁</span>
          <input onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value.trim()) { setLocalFolders((p) => [...p, e.currentTarget.value.trim()]); setNewFolder(false); } if (e.key === "Escape") setNewFolder(false); }} placeholder="Folder name…" className="flex-1 rounded-lg border border-gold/40 bg-ink px-3 py-2 text-sm text-bone outline-none" autoFocus />
        </div>
      )}
      {allFolders.map((cat) => (
        <motion.div key={cat} layout transition={{ type: "spring", stiffness: 400, damping: 35 }}>
          {renaming === cat ? (
            <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-ink-2/60 px-4 py-3">
              <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doRename(cat); if (e.key === "Escape") setRenaming(null); }} className="flex-1 rounded-lg border border-gold/40 bg-ink px-3 py-2 text-sm text-bone outline-none" autoFocus />
              <button onClick={() => doRename(cat)} className="font-mono text-[11px] text-gold">Save</button>
              <button onClick={() => setRenaming(null)} className="font-mono text-[11px] text-muted">Cancel</button>
            </div>
          ) : (
            <div
              draggable
              onDragStart={(e) => drag.handleStart(cat, e)} onDragOver={(e) => drag.handleOver(e, cat)}
              onDrop={(e) => drag.handleDrop(e, cat)} onDragEnd={drag.handleEnd}
              onClick={() => onNavigate(cat)} onContextMenu={(e) => openCtx(e, { kind: "folder", category: cat, count: catMap.get(cat)?.length ?? 0 })}
              className={`group relative flex cursor-pointer items-center gap-4 rounded-xl border border-line bg-ink-2/60 px-5 py-4 transition-all hover:border-gold/30 ${drag.dragging === cat ? "opacity-40" : ""}`}
            >
              {drag.over?.key === cat && <InsertBar side={drag.over.side} axis="y" />}
              <span className="cursor-grab font-mono text-[14px] text-muted/40">⠿</span>
              <span>📁</span>
              <span className="flex-1 truncate font-medium text-bone">{cat}</span>
              <span className="font-mono text-[11px] text-muted">{catMap.get(cat)?.length ?? 0} items</span>
            </div>
          )}
        </motion.div>
      ))}
      <AnimatePresence>{ctx && <ContextMenu x={ctx.x} y={ctx.y} items={getCtxItems()} onClose={() => setCtx(null)} />}</AnimatePresence>
    </div>
  );
}

/* ── Folder contents ─────────────────────────────────────────────────────── */
function FolderContents({ projects, category, viewMode, clipboard, onBack, onProjectsChange, onSetClipboard, onClearClipboard, categories, subcategories }: {
  projects: Project[]; category: string; viewMode: ViewMode;
  clipboard: ClipboardState;
  onBack: () => void;
  onProjectsChange: (p: Project[]) => void;
  onSetClipboard: (c: ClipboardState) => void;
  onClearClipboard: () => void;
  categories: string[]; subcategories: string[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState(projects.filter((p) => p.category === category));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; target: CtxTarget } | null>(null);
  const [moveToOpen, setMoveToOpen] = useState(false);

  const [recentlyPasted, setRecentlyPasted] = useState<Set<string>>(new Set());
  const itemScrollRef = useRef<HTMLDivElement>(null);
  const drag = useDrag(items, (p) => p.id, async (next) => {
    setItems(next);
    const res = await reorderItemsAction(next.map((p) => p.id));
    if ("error" in res) setMsg(res.error);
    else startTransition(() => router.refresh());
  }, viewMode === "list" ? "y" : "x");
  useAutoScroll(itemScrollRef, drag.dragging !== null);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "a") { e.preventDefault(); setSelected(new Set(items.map((p) => p.id))); }
      if (mod && e.key === "c") { e.preventDefault(); if (selected.size) onSetClipboard({ items: items.filter((p) => selected.has(p.id)), op: "copy" }); }
      if (mod && e.key === "x") { e.preventDefault(); if (selected.size) onSetClipboard({ items: items.filter((p) => selected.has(p.id)), op: "cut" }); }
      if (mod && e.key === "v") { e.preventDefault(); if (clipboard) doPaste(); }
      if (e.key === "Escape") { setSelected(new Set()); onClearClipboard(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function doPaste() {
    if (!clipboard) return;

    // Block duplicates: skip items whose media URL already exists in this folder
    const existingMedias = new Set(items.map((p) => p.media));
    const fresh = clipboard.items.filter((p) => !existingMedias.has(p.media));
    const skipped = clipboard.items.length - fresh.length;

    if (fresh.length === 0) {
      setMsg(skipped > 0 ? "All items already exist in this folder — nothing pasted." : "Nothing to paste.");
      onClearClipboard();
      return;
    }

    if (clipboard.op === "cut") {
      const res = await moveItemsAction(fresh.map((p) => p.id), category);
      if ("error" in res) { setMsg(res.error); return; }
      const moved = fresh.map((p) => ({ ...p, category }));
      setItems((prev) => [...prev, ...moved]);
      onProjectsChange([...projects.filter((p) => !fresh.find((c) => c.id === p.id)), ...moved]);
      // Highlight pasted items
      setRecentlyPasted(new Set(moved.map((p) => p.id)));
      setTimeout(() => setRecentlyPasted(new Set()), 2000);
    } else {
      const res = await copyItemsAction(fresh.map((p) => p.id), category);
      if ("error" in res) { setMsg(res.error); return; }
      // Add new items to state and highlight them
      setItems((prev) => [...prev, ...res.items]);
      setRecentlyPasted(new Set(res.items.map((p) => p.id)));
      setTimeout(() => setRecentlyPasted(new Set()), 2000);
    }

    onClearClipboard(); // one-time paste — clipboard cleared regardless of op
    if (skipped > 0) setMsg(`${fresh.length} pasted, ${skipped} skipped (already in folder).`);
    startTransition(() => router.refresh());
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function doEdit(vals: Parameters<typeof updateProjectAction>[0]) {
    if (!editingProject) return;
    setBusyId(editingProject.id);
    const res = await updateProjectAction(vals);
    setBusyId(null);
    if ("error" in res) { setMsg(res.error); return; }
    const updated = { ...editingProject, ...vals, subcategory: vals.subcategory || null, description: vals.description || null };
    setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    onProjectsChange(projects.map((p) => (p.id === updated.id ? updated : p)));
    setEditingProject(null);
    startTransition(() => router.refresh());
  }

  async function doDelete(project: Project) {
    if (!confirm(`Delete "${project.title}"?`)) return;
    setBusyId(project.id);
    const res = await deleteProjectAction(project.id, project.media);
    setBusyId(null);
    if ("error" in res) { setMsg(res.error); return; }
    setItems((prev) => prev.filter((p) => p.id !== project.id));
    onProjectsChange(projects.filter((p) => p.id !== project.id));
    startTransition(() => router.refresh());
  }

  async function doDeleteSelected() {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} item(s)?`)) return;
    const toDelete = items.filter((p) => selected.has(p.id)).map((p) => ({ id: p.id, media: p.media }));
    const res = await bulkDeleteProjectsAction(toDelete);
    if ("error" in res) { setMsg(res.error); return; }
    setItems((prev) => prev.filter((p) => !selected.has(p.id)));
    onProjectsChange(projects.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  async function doMoveSelected(targetCategory: string) {
    const ids = [...selected];
    const res = await moveItemsAction(ids, targetCategory);
    if ("error" in res) { setMsg(res.error); return; }
    setItems((prev) => prev.filter((p) => !selected.has(p.id)));
    onProjectsChange(projects.map((p) => selected.has(p.id) ? { ...p, category: targetCategory } : p));
    setSelected(new Set());
    setMoveToOpen(false);
    startTransition(() => router.refresh());
  }

  function openCtx(e: React.MouseEvent, target: CtxTarget) {
    e.preventDefault(); e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, target });
  }

  function getCtxItems(): MenuItem[] {
    if (!ctx) return [];
    const t = ctx.target;
    const hasSelection = selected.size > 0;

    if (t.kind === "item" && !selected.has(t.project.id)) {
      return [
        { label: "Edit", icon: "✏️", onClick: () => setEditingProject(t.project) },
        { separator: true } as MenuItem,
        { label: "Cut", icon: "✂️", shortcut: "⌘X", onClick: () => onSetClipboard({ items: [t.project], op: "cut" }) },
        { label: "Copy", icon: "📋", shortcut: "⌘C", onClick: () => onSetClipboard({ items: [t.project], op: "copy" }) },
        { label: "Move to…", icon: "📁", onClick: () => { setSelected(new Set([t.project.id])); setMoveToOpen(true); } },
        { separator: true } as MenuItem,
        { label: "Delete", icon: "🗑", danger: true, onClick: () => doDelete(t.project) },
      ];
    }

    if (t.kind === "selection" || (t.kind === "item" && selected.has(t.project.id))) {
      const count = selected.size;
      return [
        { label: `Cut ${count} item(s)`, icon: "✂️", shortcut: "⌘X", onClick: () => onSetClipboard({ items: items.filter((p) => selected.has(p.id)), op: "cut" }) },
        { label: `Copy ${count} item(s)`, icon: "📋", shortcut: "⌘C", onClick: () => onSetClipboard({ items: items.filter((p) => selected.has(p.id)), op: "copy" }) },
        { label: "Move to…", icon: "📁", onClick: () => setMoveToOpen(true) },
        { separator: true } as MenuItem,
        { label: `Delete ${count} item(s)`, icon: "🗑", danger: true, onClick: doDeleteSelected },
      ];
    }

    if (t.kind === "bg") {
      return [
        ...(clipboard ? [{ label: `Paste ${clipboard.items.length} item(s) here`, icon: "📋", shortcut: "⌘V", onClick: doPaste }] : []),
        ...(hasSelection ? [{ separator: true } as MenuItem, { label: `Cut ${selected.size} item(s)`, icon: "✂️", shortcut: "⌘X", onClick: () => onSetClipboard({ items: items.filter((p) => selected.has(p.id)), op: "cut" }) }, { label: `Copy ${selected.size}`, icon: "📋", shortcut: "⌘C", onClick: () => onSetClipboard({ items: items.filter((p) => selected.has(p.id)), op: "copy" }) }] : []),
        ...(!clipboard && !hasSelection ? [{ label: "No actions available", icon: "ℹ️", onClick: () => {}, disabled: true }] : []),
      ].filter(Boolean) as MenuItem[];
    }

    return [];
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden" onContextMenu={(e) => { if ((e.target as HTMLElement).closest("[data-item]")) return; openCtx(e, selected.size > 0 ? { kind: "selection", count: selected.size } : { kind: "bg" }); }}>
      {/* Header */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-gold">
          <span className="inline-block rotate-180">›</span> All Folders
        </button>
        <span className="text-line">/</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone">{category}</span>
        <span className="font-mono text-[10px] text-muted">({items.length})</span>

        {/* Selection toolbar */}
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-[11px] text-bone">{selected.size} selected</span>
            <button onClick={() => onSetClipboard({ items: items.filter((p) => selected.has(p.id)), op: "cut" })} className="rounded-lg border border-line px-3 py-1.5 font-mono text-[11px] text-muted hover:text-bone" title="Cut ⌘X">Cut</button>
            <button onClick={() => onSetClipboard({ items: items.filter((p) => selected.has(p.id)), op: "copy" })} className="rounded-lg border border-line px-3 py-1.5 font-mono text-[11px] text-muted hover:text-bone" title="Copy ⌘C">Copy</button>
            <button onClick={() => setMoveToOpen(true)} className="rounded-lg border border-line px-3 py-1.5 font-mono text-[11px] text-muted hover:text-bone">Move to…</button>
            <button onClick={doDeleteSelected} className="rounded-lg border border-ember/30 bg-ember/10 px-3 py-1.5 font-mono text-[11px] text-ember hover:bg-ember/20">Delete</button>
            <button onClick={() => setSelected(new Set())} className="font-mono text-[11px] text-muted hover:text-bone">✕</button>
          </div>
        )}

        {/* Clipboard indicator */}
        {clipboard && (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] ${clipboard.op === "cut" ? "border-gold/30 text-gold" : "border-line text-muted"}`}>
            {clipboard.op === "cut" ? "✂️" : "📋"} {clipboard.items.length} item(s) {clipboard.op === "cut" ? "cut" : "copied"} — right-click to paste
            <button onClick={onClearClipboard} className="ml-1 hover:text-bone">✕</button>
          </div>
        )}
      </div>

      {msg && <p className="mb-3 shrink-0 font-mono text-xs text-ember">{msg}</p>}
      {items.length === 0 && !clipboard && <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Empty folder. {clipboard ? "Right-click to paste." : ""}</p>}

      {viewMode === "grid" ? (
        <div ref={itemScrollRef} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((p) => (
              <motion.div
                key={p.id}
                layout
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                animate={recentlyPasted.has(p.id)
                  ? { boxShadow: "0 0 0 3px #f0b429, 0 0 24px rgba(240,180,41,0.5)" }
                  : { boxShadow: "0 0 0 0px transparent" }}
                style={{ borderRadius: 12 }}
              >
                <div data-item>
                  <ItemCard
                    project={p}
                    isDragging={drag.dragging === p.id}
                    overSide={drag.over?.key === p.id ? drag.over.side : null}
                    isSelected={selected.has(p.id)}
                    isCut={clipboard?.op === "cut" && clipboard.items.some((c) => c.id === p.id)}
                    onDragStart={(e) => drag.handleStart(p.id, e)} onDragOver={(e) => drag.handleOver(e, p.id)}
                    onDrop={(e) => drag.handleDrop(e, p.id)} onDragEnd={drag.handleEnd}
                    onClick={(e) => toggleSelect(p.id, e)}
                    onContext={(e) => openCtx(e, selected.has(p.id) && selected.size > 1 ? { kind: "selection", count: selected.size } : { kind: "item", project: p })}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div ref={itemScrollRef} className="flex-1 overflow-y-auto rounded-2xl border border-line">
          {items.map((p) => (
            <motion.div
              key={p.id}
              layout
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
              animate={recentlyPasted.has(p.id)
                ? { backgroundColor: "rgba(240,180,41,0.08)" }
                : { backgroundColor: "transparent" }}
            >
              <div data-item>
                <ItemRow
                  project={p}
                  isDragging={drag.dragging === p.id}
                  overSide={drag.over?.key === p.id ? drag.over.side : null}
                  isSelected={selected.has(p.id)}
                  isCut={clipboard?.op === "cut" && clipboard.items.some((c) => c.id === p.id)}
                  onDragStart={(e) => drag.handleStart(p.id, e)} onDragOver={(e) => drag.handleOver(e, p.id)}
                  onDrop={(e) => drag.handleDrop(e, p.id)} onDragEnd={drag.handleEnd}
                  onClick={(e) => toggleSelect(p.id, e)}
                  onContext={(e) => openCtx(e, selected.has(p.id) && selected.size > 1 ? { kind: "selection", count: selected.size } : { kind: "item", project: p })}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>{ctx && <ContextMenu x={ctx.x} y={ctx.y} items={getCtxItems()} onClose={() => setCtx(null)} />}</AnimatePresence>
      {moveToOpen && <MoveToDialog folders={categories.filter((c) => c !== category)} onConfirm={doMoveSelected} onClose={() => setMoveToOpen(false)} />}
      {editingProject && <EditModal project={editingProject} categories={categories} subcategories={subcategories} onSave={doEdit} onClose={() => setEditingProject(null)} busy={busyId === editingProject.id} />}
    </div>
  );
}

/* ── Root ────────────────────────────────────────────────────────────────── */
export default function ManagePanel({ projects: initial, categories, subcategories, folderOrder }: {
  projects: Project[]; categories: string[]; subcategories: string[];
  folderOrder: Record<string, number>;
}) {
  const [projects, setProjects] = useState(initial);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [clipboard, setClipboard] = useState<ClipboardState>(null);

  // Derive initial nav from current URL
  const [nav, setNav] = useState<NavState>(() => {
    if (typeof window === "undefined") return { level: "folders" };
    const match = window.location.pathname.match(/^\/admin\/manage\/(.+)$/);
    return match
      ? { level: "items", category: decodeURIComponent(match[1]) }
      : { level: "folders" };
  });

  // Sync URL when nav changes
  function goToFolder(category: string) {
    window.history.pushState({}, "", `/admin/manage/${encodeURIComponent(category)}`);
    setNav({ level: "items", category });
  }
  function goBack() {
    window.history.pushState({}, "", "/admin/manage");
    setNav({ level: "folders" });
  }

  // Browser back/forward button support
  useEffect(() => {
    const onPop = () => {
      const match = window.location.pathname.match(/^\/admin\/manage\/(.+)$/);
      setNav(match ? { level: "items", category: decodeURIComponent(match[1]) } : { level: "folders" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  async function handlePasteInto(targetCategory: string) {
    if (!clipboard) return;
    // Deduplicate against target folder
    const targetItems = projects.filter((p) => p.category === targetCategory);
    const existingMedias = new Set(targetItems.map((p) => p.media));
    const fresh = clipboard.items.filter((p) => !existingMedias.has(p.media));
    if (!fresh.length) { setClipboard(null); return; }

    if (clipboard.op === "cut") {
      const res = await moveItemsAction(fresh.map((p) => p.id), targetCategory);
      if ("error" in res) return;
      setProjects((prev) => prev.map((p) => fresh.find((c) => c.id === p.id) ? { ...p, category: targetCategory } : p));
    } else {
      const res = await copyItemsAction(fresh.map((p) => p.id), targetCategory);
      if ("error" in res) return;
      if ("items" in res) setProjects((prev) => [...prev, ...res.items]);
    }
    setClipboard(null); // one-time paste
  }

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {nav.level === "folders" ? `${[...new Set(projects.map((p) => p.category))].length} folders · right-click for options` : ""}
        </span>
        <div className="flex items-center rounded-lg border border-line p-0.5">
          {(["grid", "list"] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`rounded-md p-1.5 transition-colors ${viewMode === v ? "bg-gold/15 text-gold" : "text-muted hover:text-bone"}`}>
              {v === "grid" ? <GridViewIcon /> : <ListViewIcon />}
            </button>
          ))}
        </div>
      </div>

      {nav.level === "folders" ? (
        <FolderView
          projects={projects} folderOrder={folderOrder} viewMode={viewMode} clipboard={clipboard}
          onNavigate={goToFolder}
          onProjectsChange={setProjects}
          onPasteInto={handlePasteInto}
          onClearClipboard={() => setClipboard(null)}
        />
      ) : (
        <FolderContents
          projects={projects} category={nav.category} viewMode={viewMode} clipboard={clipboard}
          onBack={goBack}
          onProjectsChange={setProjects}
          onSetClipboard={setClipboard}
          onClearClipboard={() => setClipboard(null)}
          categories={categories} subcategories={subcategories}
        />
      )}
    </div>
  );
}

function GridViewIcon() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>; }
function ListViewIcon() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="5" height="5" rx="1" /><rect x="3" y="10" width="5" height="5" rx="1" /><rect x="3" y="16" width="5" height="5" rx="1" /><path d="M11 6.5h10M11 12.5h10M11 18.5h10" /></svg>; }
