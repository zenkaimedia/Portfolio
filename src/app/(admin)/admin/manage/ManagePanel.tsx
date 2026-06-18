"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { Project } from "@/lib/types";
import { transformImage } from "@/lib/image";
import {
  updateProjectAction,
  deleteProjectAction,
  renameFolderAction,
  deleteFolderAction,
  reorderItemsAction,
  reorderFoldersAction,
} from "../actions";

const inputCls = "w-full rounded-xl border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/50";
type ViewMode = "grid" | "list";
type NavState = { level: "folders" } | { level: "items"; category: string };

/* ── Improved drag hook ──────────────────────────────────────────────────── */
function useDrag<T>(
  items: T[],
  getKey: (t: T) => string,
  onReorder: (next: T[]) => void,
  axis: "x" | "y" = "x"
) {
  const dragKey = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ key: string; side: "before" | "after" } | null>(null);

  function handleStart(key: string, e: React.DragEvent) {
    dragKey.current = key;
    e.dataTransfer.effectAllowed = "move";
    // Delay so the browser snapshots the original before we apply opacity
    requestAnimationFrame(() => setDragging(key));
  }

  function handleOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    if (!dragKey.current || dragKey.current === key) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const side: "before" | "after" = axis === "x"
      ? (e.clientX < rect.left + rect.width / 2 ? "before" : "after")
      : (e.clientY < rect.top + rect.height / 2 ? "before" : "after");
    setOver((prev) => (prev?.key === key && prev.side === side ? prev : { key, side }));
  }

  function handleDrop(e: React.DragEvent, key: string) {
    e.preventDefault();
    const from = dragKey.current;
    const side = over?.side ?? "after";
    setDragging(null);
    dragKey.current = null;
    setOver(null);
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

  function handleEnd() {
    setDragging(null);
    dragKey.current = null;
    setOver(null);
  }

  return { dragging, over, handleStart, handleOver, handleDrop, handleEnd };
}

/* ── Drag-insert indicator bar ───────────────────────────────────────────── */
function InsertBar({ side, axis }: { side: "before" | "after"; axis: "x" | "y" }) {
  const isHorizontal = axis === "x";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.1 }}
      className={`pointer-events-none absolute z-30 flex items-center ${
        isHorizontal
          ? side === "before" ? "-left-[3px] inset-y-1" : "-right-[3px] inset-y-1"
          : side === "before" ? "-top-[3px] inset-x-1" : "-bottom-[3px] inset-x-1"
      } ${isHorizontal ? "flex-col w-[6px]" : "flex-row h-[6px]"}`}
    >
      <span
        className={`shrink-0 rounded-full bg-gold ${isHorizontal ? "w-2 h-2" : "h-2 w-2"}`}
        style={{ boxShadow: "0 0 6px var(--color-gold)" }}
      />
      <span
        className={`flex-1 rounded-full bg-gold ${isHorizontal ? "w-[2px]" : "h-[2px]"}`}
        style={{ boxShadow: "0 0 6px var(--color-gold)" }}
      />
    </motion.div>
  );
}

/* ── Edit modal ──────────────────────────────────────────────────────────── */
function EditModal({
  project, categories, subcategories, onSave, onClose, busy,
}: {
  project: Project;
  categories: string[];
  subcategories: string[];
  onSave: (v: { id: string; title: string; category: string; subcategory: string; description: string }) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(project.title);
  const [category, setCategory] = useState(project.category);
  const [subcategory, setSubcategory] = useState(project.subcategory ?? "");
  const [description, setDescription] = useState(project.description ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-ink-2 p-6 shadow-2xl"
      >
        <h3 className="mb-5 font-display text-lg font-bold text-bone">Edit Project</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} list="modal-cats" className={inputCls} />
              <datalist id="modal-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Subcategory</label>
              <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} list="modal-subs" className={inputCls} />
              <datalist id="modal-subs">{subcategories.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => onSave({ id: project.id, title, category, subcategory, description })}
            disabled={busy || !title.trim()}
            className="rounded-full border border-gold/40 bg-gold/10 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="font-mono text-xs uppercase tracking-[0.2em] text-muted hover:text-bone">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Folder card ─────────────────────────────────────────────────────────── */
function FolderCard({
  name, count, imageUrl, isDragging, overSide,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onClick, onRename, onDelete,
}: {
  name: string; count: number; imageUrl?: string;
  isDragging: boolean; overSide: "before" | "after" | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void; onRename: () => void; onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl bg-panel transition-all duration-200 ${
        isDragging ? "opacity-40 scale-95 shadow-none" : "shadow-md hover:shadow-xl"
      }`}
      onClick={onClick}
    >
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={transformImage(imageUrl, 400, 75)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

      {/* Insert indicator */}
      {overSide && <InsertBar side={overSide} axis="x" />}

      {/* Actions */}
      <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        <button onClick={onRename} className="grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-muted backdrop-blur transition-colors hover:text-gold" title="Rename"><PencilIcon /></button>
        <button onClick={onDelete} className="grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-muted backdrop-blur transition-colors hover:text-ember" title="Delete"><TrashIcon /></button>
      </div>

      {/* Grip */}
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

/* ── Folder list row ─────────────────────────────────────────────────────── */
function FolderRow({
  name, count, isDragging, overSide,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onClick, onRename, onDelete,
}: {
  name: string; count: number;
  isDragging: boolean; overSide: "before" | "after" | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void; onRename: () => void; onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group relative flex cursor-pointer items-center gap-4 rounded-xl border border-line bg-ink-2/60 px-5 py-4 transition-all hover:border-gold/30 ${
        isDragging ? "opacity-40 scale-[0.98]" : ""
      }`}
    >
      {overSide && <InsertBar side={overSide} axis="y" />}
      <span className="cursor-grab font-mono text-[14px] text-muted/40 group-hover:text-muted">⠿</span>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gold/70">
        <path d="M3.5 6.8a1.5 1.5 0 0 1 1.5-1.5h4l2 2.2h7.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V6.8z" />
      </svg>
      <span className="flex-1 truncate font-medium text-bone">{name}</span>
      <span className="font-mono text-[11px] text-muted">{count} items</span>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        <button onClick={onRename} className="text-muted hover:text-gold"><PencilIcon /></button>
        <button onClick={onDelete} className="text-muted hover:text-ember"><TrashIcon /></button>
      </div>
    </div>
  );
}

/* ── Item card ───────────────────────────────────────────────────────────── */
function ItemCard({
  project, isDragging, overSide,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onEdit, onDelete,
}: {
  project: Project;
  isDragging: boolean; overSide: "before" | "after" | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative aspect-[4/3] overflow-hidden rounded-xl bg-black transition-all duration-200 ${
        isDragging ? "opacity-40 scale-95 shadow-none z-0" : "shadow-md"
      }`}
    >
      {/* Insert indicator line */}
      {overSide && <InsertBar side={overSide} axis="x" />}

      {project.type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={transformImage(project.media, 300, 75)} alt={project.title} loading="lazy" draggable={false} className="h-full w-full object-cover" />
      )}
      {project.type === "video" && (
        <video src={project.media} muted playsInline preload="metadata" onLoadedMetadata={(e) => { try { e.currentTarget.currentTime = 0.1; } catch { /**/ } }} className="h-full w-full object-cover" />
      )}
      {(project.type === "pdf" || project.type === "website") && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-panel/80">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{project.type}</span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col justify-between bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <div className="flex justify-between p-2">
          <span className="cursor-grab rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] text-muted select-none">⠿</span>
          <div className="flex gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-muted transition-colors hover:text-gold" title="Edit"><PencilIcon /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-muted transition-colors hover:text-ember" title="Delete"><TrashIcon /></button>
          </div>
        </div>
        <p className="truncate px-3 pb-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white">{project.title}</p>
      </div>
    </div>
  );
}

/* ── Item list row ───────────────────────────────────────────────────────── */
function ItemRow({
  project, isDragging, overSide,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onEdit, onDelete,
}: {
  project: Project;
  isDragging: boolean; overSide: "before" | "after" | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative flex items-center gap-3 border-b border-line/60 px-4 py-3 transition-all hover:bg-white/[0.02] ${
        isDragging ? "opacity-40 scale-[0.99]" : ""
      }`}
    >
      {overSide && <InsertBar side={overSide} axis="y" />}
      <span className="cursor-grab select-none font-mono text-[14px] text-muted/40 hover:text-muted">⠿</span>
      <span className="grid h-8 w-12 shrink-0 place-items-center overflow-hidden rounded border border-line bg-black">
        {project.type === "image"
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={transformImage(project.media, 80, 70)} alt="" loading="lazy" className="h-full w-full object-cover" />
          : <span className="font-mono text-[7px] uppercase text-muted">{project.type === "video" ? "VID" : project.type === "pdf" ? "PDF" : "WEB"}</span>
        }
      </span>
      <span className="flex-1 truncate text-sm text-bone">{project.title}</span>
      {project.subcategory && (
        <span className="hidden rounded-full border border-line px-2 py-0.5 font-mono text-[9px] text-muted sm:inline">{project.subcategory}</span>
      )}
      <span className="hidden font-mono text-[9px] uppercase text-muted/60 md:block">{project.type}</span>
      <div className="flex shrink-0 items-center gap-2 opacity-0 group-hover:opacity-100">
        <button onClick={onEdit} className="text-muted transition-colors hover:text-gold" title="Edit"><PencilIcon /></button>
        <button onClick={onDelete} className="text-muted transition-colors hover:text-ember" title="Delete"><TrashIcon /></button>
      </div>
    </div>
  );
}

/* ── Folder view ─────────────────────────────────────────────────────────── */
function FolderView({
  projects, folderOrder, viewMode, onNavigate, onProjectsChange,
}: {
  projects: Project[];
  folderOrder: Record<string, number>;
  viewMode: ViewMode;
  onNavigate: (category: string) => void;
  onProjectsChange: (p: Project[]) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const MAX = Number.MAX_SAFE_INTEGER;
  const catMap = new Map<string, Project[]>();
  for (const p of projects) {
    if (!catMap.has(p.category)) catMap.set(p.category, []);
    catMap.get(p.category)!.push(p);
  }
  const [folders, setFolders] = useState(
    [...catMap.keys()].sort((a, b) => {
      const pa = folderOrder[a] ?? MAX, pb = folderOrder[b] ?? MAX;
      return pa !== pb ? pa - pb : a.localeCompare(b);
    })
  );

  const drag = useDrag(folders, (f) => f, async (next) => {
    setFolders(next);
    const res = await reorderFoldersAction(next);
    if ("error" in res) setMsg(res.error);
    else startTransition(() => router.refresh());
  }, viewMode === "list" ? "y" : "x");

  async function doRename(category: string) {
    if (!renameVal.trim()) return;
    const res = await renameFolderAction({ category, subcategory: null, newName: renameVal.trim() });
    if ("error" in res) { setMsg(res.error); return; }
    setRenaming(null);
    startTransition(() => router.refresh());
  }

  async function doDelete(category: string) {
    const count = catMap.get(category)?.length ?? 0;
    if (!confirm(`Delete "${category}" and all ${count} item(s)? This cannot be undone.`)) return;
    const res = await deleteFolderAction({ category, subcategory: null });
    if ("error" in res) { setMsg(res.error); return; }
    onProjectsChange(projects.filter((p) => p.category !== category));
    setFolders((prev) => prev.filter((f) => f !== category));
    startTransition(() => router.refresh());
  }

  const firstImageFor = (cat: string) => catMap.get(cat)?.find((p) => p.type === "image")?.media;

  if (viewMode === "grid") {
    return (
      <div className="flex-1 overflow-y-auto">
        {msg && <p className="mb-3 font-mono text-xs text-ember">{msg}</p>}
        {folders.length === 0 && <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">No folders yet — add projects first.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {folders.map((cat) =>
            renaming === cat ? (
              <motion.div key={cat} layout className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl border border-gold/30 bg-ink-2/60 p-4">
                <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doRename(cat); if (e.key === "Escape") setRenaming(null); }} className="w-full rounded-lg border border-gold/40 bg-ink px-3 py-2 text-sm text-bone outline-none focus:border-gold" autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => doRename(cat)} className="font-mono text-[11px] text-gold">Save</button>
                  <button onClick={() => setRenaming(null)} className="font-mono text-[11px] text-muted">Cancel</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key={cat} layout transition={{ type: "spring", stiffness: 400, damping: 35 }}>
                <FolderCard
                  name={cat}
                  count={catMap.get(cat)?.length ?? 0}
                  imageUrl={firstImageFor(cat)}
                  isDragging={drag.dragging === cat}
                  overSide={drag.over?.key === cat ? drag.over.side : null}
                  onDragStart={(e) => drag.handleStart(cat, e)}
                  onDragOver={(e) => drag.handleOver(e, cat)}
                  onDrop={(e) => drag.handleDrop(e, cat)}
                  onDragEnd={drag.handleEnd}
                  onClick={() => onNavigate(cat)}
                  onRename={() => { setRenaming(cat); setRenameVal(cat); }}
                  onDelete={() => doDelete(cat)}
                />
              </motion.div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2">
      {msg && <p className="font-mono text-xs text-ember">{msg}</p>}
      {folders.map((cat) =>
        renaming === cat ? (
          <motion.div key={cat} layout className="flex items-center gap-3 rounded-xl border border-gold/30 bg-ink-2/60 px-4 py-3">
            <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doRename(cat); if (e.key === "Escape") setRenaming(null); }} className="flex-1 rounded-lg border border-gold/40 bg-ink px-3 py-2 text-sm text-bone outline-none focus:border-gold" autoFocus />
            <button onClick={() => doRename(cat)} className="font-mono text-[11px] text-gold">Save</button>
            <button onClick={() => setRenaming(null)} className="font-mono text-[11px] text-muted">Cancel</button>
          </motion.div>
        ) : (
          <motion.div key={cat} layout transition={{ type: "spring", stiffness: 400, damping: 35 }}>
            <FolderRow
              name={cat}
              count={catMap.get(cat)?.length ?? 0}
              isDragging={drag.dragging === cat}
              overSide={drag.over?.key === cat ? drag.over.side : null}
              onDragStart={(e) => drag.handleStart(cat, e)}
              onDragOver={(e) => drag.handleOver(e, cat)}
              onDrop={(e) => drag.handleDrop(e, cat)}
              onDragEnd={drag.handleEnd}
              onClick={() => onNavigate(cat)}
              onRename={() => { setRenaming(cat); setRenameVal(cat); }}
              onDelete={() => doDelete(cat)}
            />
          </motion.div>
        )
      )}
    </div>
  );
}

/* ── Folder contents ─────────────────────────────────────────────────────── */
function FolderContents({
  projects, category, viewMode, onBack, onProjectsChange, categories, subcategories,
}: {
  projects: Project[];
  category: string;
  viewMode: ViewMode;
  onBack: () => void;
  onProjectsChange: (p: Project[]) => void;
  categories: string[];
  subcategories: string[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState(projects.filter((p) => p.category === category));
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const drag = useDrag(items, (p) => p.id, async (next) => {
    setItems(next);
    const res = await reorderItemsAction(next.map((p) => p.id));
    if ("error" in res) setMsg(res.error);
    else startTransition(() => router.refresh());
  }, viewMode === "list" ? "y" : "x");

  async function handleEdit(vals: Parameters<typeof updateProjectAction>[0]) {
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

  async function handleDelete(project: Project) {
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    setBusyId(project.id);
    const res = await deleteProjectAction(project.id, project.media);
    setBusyId(null);
    if ("error" in res) { setMsg(res.error); return; }
    setItems((prev) => prev.filter((p) => p.id !== project.id));
    onProjectsChange(projects.filter((p) => p.id !== project.id));
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-gold">
          <span className="inline-block rotate-180">›</span> All Folders
        </button>
        <span className="text-line">/</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone">{category}</span>
        <span className="font-mono text-[10px] text-muted">({items.length})</span>
      </div>

      {msg && <p className="mb-3 shrink-0 font-mono text-xs text-ember">{msg}</p>}
      {items.length === 0 && <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">This folder is empty.</p>}

      {viewMode === "grid" ? (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((p) => (
              <motion.div key={p.id} layout transition={{ type: "spring", stiffness: 500, damping: 40 }}>
                <ItemCard
                  project={p}
                  isDragging={drag.dragging === p.id}
                  overSide={drag.over?.key === p.id ? drag.over.side : null}
                  onDragStart={(e) => drag.handleStart(p.id, e)}
                  onDragOver={(e) => drag.handleOver(e, p.id)}
                  onDrop={(e) => drag.handleDrop(e, p.id)}
                  onDragEnd={drag.handleEnd}
                  onEdit={() => setEditingProject(p)}
                  onDelete={() => handleDelete(p)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto rounded-2xl border border-line">
          {items.map((p) => (
            <motion.div key={p.id} layout transition={{ type: "spring", stiffness: 500, damping: 40 }}>
              <ItemRow
                project={p}
                isDragging={drag.dragging === p.id}
                overSide={drag.over?.key === p.id ? drag.over.side : null}
                onDragStart={(e) => drag.handleStart(p.id, e)}
                onDragOver={(e) => drag.handleOver(e, p.id)}
                onDrop={(e) => drag.handleDrop(e, p.id)}
                onDragEnd={drag.handleEnd}
                onEdit={() => setEditingProject(p)}
                onDelete={() => handleDelete(p)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {editingProject && (
        <EditModal
          project={editingProject}
          categories={categories}
          subcategories={subcategories}
          onSave={handleEdit}
          onClose={() => setEditingProject(null)}
          busy={busyId === editingProject.id}
        />
      )}
    </div>
  );
}

/* ── Root ────────────────────────────────────────────────────────────────── */
export default function ManagePanel({
  projects: initial, categories, subcategories, folderOrder,
}: {
  projects: Project[];
  categories: string[];
  subcategories: string[];
  folderOrder: Record<string, number>;
}) {
  const [projects, setProjects] = useState(initial);
  const [nav, setNav] = useState<NavState>({ level: "folders" });
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {nav.level === "folders" ? `${[...new Set(projects.map((p) => p.category))].length} folders` : ""}
        </span>
        <div className="flex items-center rounded-lg border border-line p-0.5">
          {(["grid", "list"] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setViewMode(v)} aria-label={`${v} view`}
              className={`rounded-md p-1.5 transition-colors ${viewMode === v ? "bg-gold/15 text-gold" : "text-muted hover:text-bone"}`}>
              {v === "grid" ? <GridViewIcon /> : <ListViewIcon />}
            </button>
          ))}
        </div>
      </div>

      {nav.level === "folders" ? (
        <FolderView
          projects={projects}
          folderOrder={folderOrder}
          viewMode={viewMode}
          onNavigate={(cat) => setNav({ level: "items", category: cat })}
          onProjectsChange={setProjects}
        />
      ) : (
        <FolderContents
          projects={projects}
          category={nav.category}
          viewMode={viewMode}
          onBack={() => setNav({ level: "folders" })}
          onProjectsChange={setProjects}
          categories={categories}
          subcategories={subcategories}
        />
      )}
    </div>
  );
}

function PencilIcon() {
  return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function TrashIcon() {
  return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
}
function GridViewIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>;
}
function ListViewIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="5" height="5" rx="1" /><rect x="3" y="10" width="5" height="5" rx="1" /><rect x="3" y="16" width="5" height="5" rx="1" /><path d="M11 6.5h10M11 12.5h10M11 18.5h10" /></svg>;
}
