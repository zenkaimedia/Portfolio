"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { Project } from "@/lib/types";
import {
  updateProjectAction,
  deleteProjectAction,
  renameFolderAction,
  deleteFolderAction,
  reorderItemsAction,
  reorderFoldersAction,
} from "../actions";

type Result = { ok: true } | { error: string };
const MAX = Number.MAX_SAFE_INTEGER;

type Dialog =
  | {
      kind: "confirm";
      title: string;
      message: string;
      confirmLabel: string;
      onConfirm: () => void;
    }
  | {
      kind: "rename";
      title: string;
      current: string;
      onConfirm: (value: string) => void;
    };

export default function ManagePanel({
  projects,
  categories,
  subcategories,
  folderOrder,
}: {
  projects: Project[];
  categories: string[];
  subcategories: string[];
  folderOrder: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { directFiles: Project[]; subs: Map<string, Project[]> }
    >();
    for (const p of projects) {
      if (!map.has(p.category))
        map.set(p.category, { directFiles: [], subs: new Map() });
      const g = map.get(p.category)!;
      if (p.subcategory && p.subcategory.trim()) {
        if (!g.subs.has(p.subcategory)) g.subs.set(p.subcategory, []);
        g.subs.get(p.subcategory)!.push(p);
      } else {
        g.directFiles.push(p);
      }
    }
    return [...map.entries()].sort((a, b) => {
      const pa = folderOrder[a[0]] ?? MAX;
      const pb = folderOrder[b[0]] ?? MAX;
      return pa !== pb ? pa - pb : a[0].localeCompare(b[0]);
    });
  }, [projects, folderOrder]);

  async function run(fn: () => Promise<Result>) {
    setMsg(null);
    const res = await fn();
    if ("error" in res) {
      setMsg({ type: "error", text: res.error });
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  const renameFolder = (category: string, subcategory: string | null) => {
    const current = subcategory ?? category;
    setDialog({
      kind: "rename",
      title: subcategory ? "Rename subfolder" : "Rename folder",
      current,
      onConfirm: (value) => {
        const newName = value.trim();
        setDialog(null);
        if (!newName || newName === current) return;
        run(() => renameFolderAction({ category, subcategory, newName }));
      },
    });
  };

  const deleteFolder = (
    category: string,
    subcategory: string | null,
    count: number
  ) => {
    const name = subcategory ?? category;
    setDialog({
      kind: "confirm",
      title: `Delete “${name}”?`,
      message: `This deletes the folder and all ${count} item(s) inside it, including their files. This cannot be undone.`,
      confirmLabel: "Delete folder",
      onConfirm: () => {
        setDialog(null);
        run(() => deleteFolderAction({ category, subcategory }));
      },
    });
  };

  const deleteItem = (p: Project) => {
    setDialog({
      kind: "confirm",
      title: `Delete “${p.title}”?`,
      message: "This permanently deletes the item and its file. This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: () => {
        setDialog(null);
        run(() => deleteProjectAction(p.id, p.media));
      },
    });
  };

  if (projects.length === 0) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
        Nothing here yet — add your first project.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {msg && (
        <p
          className={`font-mono text-xs ${
            msg.type === "error" ? "text-ember" : "text-gold-soft"
          }`}
        >
          {msg.text}
        </p>
      )}
      {pending && (
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Saving…
        </p>
      )}

      <datalist id="m-cats">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="m-subs">
        {subcategories.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Categories (reorderable) */}
      <SortableList
        items={groups}
        getKey={([name]) => name}
        onReorder={(names) => run(() => reorderFoldersAction(names))}
        renderRow={([category, g], catHandle) => {
          const subEntries = [...g.subs.entries()].sort((a, b) => {
            const pa = folderOrder[`${category}/${a[0]}`] ?? MAX;
            const pb = folderOrder[`${category}/${b[0]}`] ?? MAX;
            return pa !== pb ? pa - pb : a[0].localeCompare(b[0]);
          });
          const total =
            g.directFiles.length +
            subEntries.reduce((n, [, items]) => n + items.length, 0);

          return (
            <section className="rounded-2xl border border-line">
              <FolderHeader
                label={category}
                count={total}
                handle={catHandle}
                onRename={() => renameFolder(category, null)}
                onDelete={() => deleteFolder(category, null, total)}
                top
              />

              {/* direct files (reorderable) */}
              <SortableList
                items={g.directFiles}
                getKey={(p) => p.id}
                onReorder={(ids) => run(() => reorderItemsAction(ids))}
                renderRow={(p, handle) => (
                  <Item
                    project={p}
                    handle={handle}
                    editing={editingId === p.id}
                    onEdit={() => setEditingId(p.id)}
                    onCancel={() => setEditingId(null)}
                    onSave={async (vals) => {
                      const ok = await run(() =>
                        updateProjectAction({ id: p.id, ...vals })
                      );
                      if (ok) setEditingId(null);
                    }}
                    onDelete={() => deleteItem(p)}
                  />
                )}
              />

              {/* subfolders (reorderable) */}
              <SortableList
                items={subEntries}
                getKey={([name]) => name}
                onReorder={(names) =>
                  run(() =>
                    reorderFoldersAction(names.map((n) => `${category}/${n}`))
                  )
                }
                renderRow={([sub, items], subHandle) => (
                  <div className="border-t border-line/60">
                    <FolderHeader
                      label={sub}
                      count={items.length}
                      handle={subHandle}
                      onRename={() => renameFolder(category, sub)}
                      onDelete={() => deleteFolder(category, sub, items.length)}
                    />
                    <SortableList
                      items={items}
                      getKey={(p) => p.id}
                      onReorder={(ids) => run(() => reorderItemsAction(ids))}
                      renderRow={(p, handle) => (
                        <Item
                          project={p}
                          handle={handle}
                          editing={editingId === p.id}
                          onEdit={() => setEditingId(p.id)}
                          onCancel={() => setEditingId(null)}
                          onSave={async (vals) => {
                            const ok = await run(() =>
                              updateProjectAction({ id: p.id, ...vals })
                            );
                            if (ok) setEditingId(null);
                          }}
                          onDelete={() => deleteItem(p)}
                        />
                      )}
                    />
                  </div>
                )}
              />
            </section>
          );
        }}
      />

      {dialog && <Dialog dialog={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}

/* ── In-app dialog (replaces window.prompt / window.confirm) ───────────────── */
function Dialog({ dialog, onClose }: { dialog: Dialog; onClose: () => void }) {
  const [value, setValue] = useState(
    dialog.kind === "rename" ? dialog.current : ""
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-ink-2 p-6 shadow-2xl"
        style={{ animation: "rise 0.2s ease both" }}
      >
        <h3 className="mb-4 font-display text-lg font-bold text-bone">
          {dialog.title}
        </h3>

        {dialog.kind === "rename" ? (
          <>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") dialog.onConfirm(value);
              }}
              className={editInput}
            />
            <div className="mt-5 flex justify-end gap-3">
              <DialogButton onClick={onClose} variant="ghost">
                Cancel
              </DialogButton>
              <DialogButton onClick={() => dialog.onConfirm(value)} variant="gold">
                Save
              </DialogButton>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">{dialog.message}</p>
            <div className="mt-5 flex justify-end gap-3">
              <DialogButton onClick={onClose} variant="ghost">
                Cancel
              </DialogButton>
              <DialogButton onClick={dialog.onConfirm} variant="danger">
                {dialog.confirmLabel}
              </DialogButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DialogButton({
  onClick,
  variant,
  children,
}: {
  onClick: () => void;
  variant: "ghost" | "gold" | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    ghost: "border border-line text-muted hover:text-bone",
    gold: "border border-gold/40 bg-gold/10 text-gold-soft hover:bg-gold/20",
    danger: "border border-ember/40 bg-ember/10 text-ember hover:bg-ember/20",
  } as const;
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

/* ── Generic drag-to-reorder list (drag handle separates nesting levels) ───── */
type HandleProps = {
  draggable: true;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
};

function SortableList<T>({
  items,
  getKey,
  onReorder,
  renderRow,
}: {
  items: T[];
  getKey: (t: T) => string;
  onReorder: (orderedKeys: string[]) => void;
  renderRow: (item: T, handle: HandleProps) => React.ReactNode;
}) {
  const signature = items.map(getKey).join("|");
  const [list, setList] = useState(items);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [over, setOver] = useState<{ key: string; side: "top" | "bottom" } | null>(
    null
  );
  const from = useRef<number | null>(null);

  // Re-sync whenever the server data (order/contents) actually changes.
  useEffect(() => setList(items), [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  const clear = () => {
    from.current = null;
    setDragKey(null);
    setOver(null);
  };

  const handleFor = (i: number, key: string): HandleProps => ({
    draggable: true,
    onDragStart: (e) => {
      from.current = i;
      e.stopPropagation();
      e.dataTransfer.effectAllowed = "move";
      // Apply the "lifted" style after the browser snapshots the drag image.
      setTimeout(() => setDragKey(key), 0);
    },
    onDragEnd: clear,
  });

  const onRowDragOver = (e: React.DragEvent, key: string) => {
    if (from.current === null) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const side = e.clientY < rect.top + rect.height / 2 ? "top" : "bottom";
    setOver((prev) =>
      prev?.key === key && prev.side === side ? prev : { key, side }
    );
  };

  const onRowDrop = (e: React.DragEvent, i: number) => {
    if (from.current === null) return;
    e.stopPropagation();
    const f = from.current;
    const side = over?.side ?? "top";
    clear();
    let to = side === "top" ? i : i + 1;
    if (f < to) to -= 1; // adjust for removing the source first
    if (to === f || to < 0) return;
    const next = [...list];
    const [moved] = next.splice(f, 1);
    next.splice(to, 0, moved);
    setList(next);
    onReorder(next.map(getKey));
  };

  return (
    <>
      {list.map((item, i) => {
        const key = getKey(item);
        const isDragging = dragKey === key;
        const showTop = over?.key === key && over.side === "top";
        const showBottom = over?.key === key && over.side === "bottom";
        return (
          <motion.div
            key={key}
            layout
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            onDragOver={(e) => onRowDragOver(e, key)}
            onDrop={(e) => onRowDrop(e, i)}
            className={`relative rounded-lg transition-[opacity,box-shadow,transform] duration-150 ${
              isDragging
                ? "z-20 scale-[1.01] opacity-60 shadow-2xl ring-1 ring-gold/60"
                : ""
            }`}
          >
            {showTop && <DropLine pos="top" />}
            {renderRow(item, handleFor(i, key))}
            {showBottom && <DropLine pos="bottom" />}
          </motion.div>
        );
      })}
    </>
  );
}

/** Glowing gold insertion line shown at the edge where the item will drop. */
function DropLine({ pos }: { pos: "top" | "bottom" }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scaleX: 0.6 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.12 }}
      aria-hidden
      className={`pointer-events-none absolute left-2 right-2 z-30 flex items-center ${
        pos === "top" ? "-top-[3px]" : "-bottom-[3px]"
      }`}
    >
      <span
        className="h-2 w-2 shrink-0 -translate-x-1 rounded-full"
        style={{ background: "var(--color-gold)", boxShadow: "0 0 8px var(--color-gold)" }}
      />
      <span
        className="h-[2px] flex-1 rounded-full"
        style={{ background: "var(--color-gold)", boxShadow: "0 0 8px var(--color-gold)" }}
      />
    </motion.div>
  );
}

function Grip({ handle }: { handle: HandleProps }) {
  return (
    <span
      {...handle}
      title="Drag to reorder"
      className="shrink-0 cursor-grab select-none px-1 text-muted/40 hover:text-muted active:cursor-grabbing"
    >
      ⠿
    </span>
  );
}

function FolderHeader({
  label,
  count,
  handle,
  onRename,
  onDelete,
  top = false,
}: {
  label: string;
  count: number;
  handle: HandleProps;
  onRename: () => void;
  onDelete: () => void;
  top?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-3 ${
        top ? "" : "pl-6"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Grip handle={handle} />
        <span
          className={`truncate font-mono uppercase tracking-[0.2em] ${
            top ? "text-[12px] text-bone" : "text-[11px] text-bone/80"
          }`}
        >
          {label}
        </span>
        <span className="font-mono text-[10px] text-muted">({count})</span>
      </div>
      <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
        <button onClick={onRename} className="text-muted hover:text-gold">
          Rename
        </button>
        <button onClick={onDelete} className="text-muted hover:text-ember">
          Delete
        </button>
      </div>
    </div>
  );
}

function Item({
  project,
  handle,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  project: Project;
  handle: HandleProps;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (vals: {
    title: string;
    category: string;
    subcategory: string;
    description: string;
  }) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [category, setCategory] = useState(project.category);
  const [subcategory, setSubcategory] = useState(project.subcategory ?? "");
  const [description, setDescription] = useState(project.description ?? "");

  if (editing) {
    return (
      <div className="space-y-3 border-t border-line/60 bg-ink/40 px-3 py-4 pl-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={editInput}
          />
          <div className="hidden sm:block" />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="m-cats"
            placeholder="Category"
            className={editInput}
          />
          <input
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            list="m-subs"
            placeholder="Subcategory (optional)"
            className={editInput}
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Description"
          className={editInput}
        />
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em]">
          <button
            onClick={() => onSave({ title, category, subcategory, description })}
            className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-gold-soft hover:bg-gold/20"
          >
            Save
          </button>
          <button onClick={onCancel} className="text-muted hover:text-bone">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-t border-line/60 px-3 py-3 pl-6">
      <Grip handle={handle} />
      <span className="grid h-8 w-12 shrink-0 place-items-center overflow-hidden rounded border border-line bg-black">
        {project.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.media}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-mono text-[8px] uppercase text-muted">
            {project.type === "video" ? "VID" : "WEB"}
          </span>
        )}
      </span>
      <span className="flex-1 truncate text-sm text-bone">{project.title}</span>
      <span className="hidden font-mono text-[9px] uppercase tracking-[0.15em] text-muted/60 sm:inline">
        {project.type}
      </span>
      <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
        <button onClick={onEdit} className="text-muted hover:text-gold">
          Edit
        </button>
        <button onClick={onDelete} className="text-muted hover:text-ember">
          Delete
        </button>
      </div>
    </div>
  );
}

const editInput =
  "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/50";
