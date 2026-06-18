"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import { transformImage } from "@/lib/image";
import {
  updateProjectAction,
  deleteProjectAction,
  bulkDeleteProjectsAction,
  renameFolderAction,
  deleteFolderAction,
} from "../actions";

const PER_PAGE = 50;
const inputCls = "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/50";

type SortKey = "date_desc" | "date_asc" | "title_asc" | "title_desc" | "category_asc";

function sortProjects(projects: Project[], key: SortKey): Project[] {
  return [...projects].sort((a, b) => {
    switch (key) {
      case "date_desc": return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      case "date_asc":  return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      case "title_asc": return a.title.localeCompare(b.title);
      case "title_desc":return b.title.localeCompare(a.title);
      case "category_asc": return a.category.localeCompare(b.category);
    }
  });
}

/* ── Inline edit row ─────────────────────────────────────────────────────── */
function EditRow({
  project,
  categories,
  subcategories,
  onSave,
  onCancel,
  busy,
}: {
  project: Project;
  categories: string[];
  subcategories: string[];
  onSave: (vals: { title: string; category: string; subcategory: string; description: string }) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(project.title);
  const [category, setCategory] = useState(project.category);
  const [subcategory, setSubcategory] = useState(project.subcategory ?? "");
  const [description, setDescription] = useState(project.description ?? "");

  return (
    <div className="border-b border-line bg-ink/40 px-4 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </div>
        <div className="hidden sm:block" />
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} list="edit-cats" className={inputCls} />
          <datalist id="edit-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Subcategory</label>
          <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} list="edit-subs" className={inputCls} />
          <datalist id="edit-subs">{subcategories.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => onSave({ title, category, subcategory, description })}
          disabled={busy}
          className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-bone">Cancel</button>
      </div>
    </div>
  );
}

/* ── Projects tab ────────────────────────────────────────────────────────── */
function ProjectsTab({
  projects,
  categories,
  subcategories,
  onProjectsChange,
}: {
  projects: Project[];
  categories: string[];
  subcategories: string[];
  onProjectsChange: (projects: Project[]) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Filter + sort
  const filtered = sortProjects(
    projects.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "all" || p.category === catFilter;
      return matchSearch && matchCat;
    }),
    sort
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const pageIds = paginated.map((p) => p.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleEdit(id: string, vals: Parameters<typeof updateProjectAction>[0]) {
    setBusyId(id); setMsg(null);
    const res = await updateProjectAction(vals);
    setBusyId(null);
    if ("error" in res) { setMsg({ type: "error", text: res.error }); return; }
    onProjectsChange(projects.map((p) => p.id === id ? { ...p, ...vals, subcategory: vals.subcategory || null, description: vals.description || null } : p));
    setEditingId(null);
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string, media: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setBusyId(id); setMsg(null);
    const res = await deleteProjectAction(id, media);
    setBusyId(null);
    if ("error" in res) { setMsg({ type: "error", text: res.error }); return; }
    onProjectsChange(projects.filter((p) => p.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} selected project(s)? This cannot be undone.`)) return;
    setBulkBusy(true); setMsg(null);
    const items = projects.filter((p) => selectedIds.has(p.id)).map((p) => ({ id: p.id, media: p.media }));
    const res = await bulkDeleteProjectsAction(items);
    setBulkBusy(false);
    if ("error" in res) { setMsg({ type: "error", text: res.error }); return; }
    onProjectsChange(projects.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setMsg({ type: "ok", text: `${res.deleted} project(s) deleted.` });
    startTransition(() => router.refresh());
  }

  const pageIds = paginated.map((p) => p.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 space-y-2 pb-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search by title or category…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm text-bone outline-none transition-colors placeholder:text-muted/50 focus:border-gold"
          />
          <select
            value={catFilter}
            onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs text-bone outline-none focus:border-gold"
          >
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs text-bone outline-none focus:border-gold"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="title_asc">Title A→Z</option>
            <option value="title_desc">Title Z→A</option>
            <option value="category_asc">Category A→Z</option>
          </select>
        </div>

        {/* Bulk bar */}
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={allPageSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 accent-gold"
            />
            <span className="font-mono text-[11px] text-muted">Select page</span>
          </label>
          {selectedIds.size > 0 && (
            <>
              <span className="font-mono text-[11px] text-bone">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkDelete}
                disabled={bulkBusy}
                className="rounded-full border border-ember/40 bg-ember/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-ember transition-colors hover:bg-ember/20 disabled:opacity-40"
              >
                {bulkBusy ? "Deleting…" : `Delete ${selectedIds.size}`}
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="font-mono text-[11px] text-muted hover:text-bone">
                Clear
              </button>
            </>
          )}
          <span className="ml-auto font-mono text-[10px] text-muted">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            {totalPages > 1 && ` · page ${currentPage}/${totalPages}`}
          </span>
        </div>

        {msg && (
          <p className={`font-mono text-xs ${msg.type === "error" ? "text-ember" : "text-gold-soft"}`}>
            {msg.text}
          </p>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-line">
        {paginated.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">No results</p>
          </div>
        ) : (
          paginated.map((p) => (
            <div key={p.id}>
              {/* Row */}
              <div className={`flex items-center gap-3 border-b border-line/60 px-4 py-3 transition-colors ${editingId === p.id ? "bg-ink/40" : "hover:bg-white/[0.02]"}`}>
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  className="h-4 w-4 shrink-0 accent-gold"
                />

                {/* Thumbnail */}
                <span className="grid h-8 w-12 shrink-0 place-items-center overflow-hidden rounded border border-line bg-black">
                  {p.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={transformImage(p.media, 80, 70)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-mono text-[7px] uppercase text-muted">
                      {p.type === "video" ? "VID" : p.type === "pdf" ? "PDF" : "WEB"}
                    </span>
                  )}
                </span>

                {/* Title */}
                <span className="flex-1 truncate text-sm text-bone">{p.title}</span>

                {/* Category */}
                <span className="hidden w-32 truncate font-mono text-[10px] text-muted sm:block">
                  {p.subcategory ? `${p.category} / ${p.subcategory}` : p.category}
                </span>

                {/* Type */}
                <span className="hidden w-12 font-mono text-[9px] uppercase tracking-[0.12em] text-muted/60 md:block">
                  {p.type}
                </span>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em]">
                  <button
                    onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                    className="text-muted transition-colors hover:text-gold"
                  >
                    {editingId === p.id ? "Close" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.media)}
                    disabled={busyId === p.id}
                    className="text-muted transition-colors hover:text-ember disabled:opacity-40"
                  >
                    {busyId === p.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>

              {/* Inline edit */}
              {editingId === p.id && (
                <EditRow
                  project={p}
                  categories={categories}
                  subcategories={subcategories}
                  onSave={(vals) => handleEdit(p.id, { id: p.id, ...vals })}
                  onCancel={() => setEditingId(null)}
                  busy={busyId === p.id}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-1 pt-3">
          <button
            onClick={() => setPage(1)}
            disabled={currentPage === 1}
            className="rounded px-2 py-1 font-mono text-[11px] text-muted disabled:opacity-30 hover:text-bone"
          >
            ««
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded px-2 py-1 font-mono text-[11px] text-muted disabled:opacity-30 hover:text-bone"
          >
            ‹
          </button>

          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pg: number;
            if (totalPages <= 7) pg = i + 1;
            else if (currentPage <= 4) pg = i + 1;
            else if (currentPage >= totalPages - 3) pg = totalPages - 6 + i;
            else pg = currentPage - 3 + i;
            return (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`min-w-[2rem] rounded px-2 py-1 font-mono text-[11px] transition-colors ${
                  pg === currentPage
                    ? "bg-gold/15 text-gold"
                    : "text-muted hover:text-bone"
                }`}
              >
                {pg}
              </button>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded px-2 py-1 font-mono text-[11px] text-muted disabled:opacity-30 hover:text-bone"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={currentPage === totalPages}
            className="rounded px-2 py-1 font-mono text-[11px] text-muted disabled:opacity-30 hover:text-bone"
          >
            »»
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Folders tab ─────────────────────────────────────────────────────────── */
function FoldersTab({
  projects,
  folderOrder,
  onProjectsChange,
}: {
  projects: Project[];
  folderOrder: Record<string, number>;
  onProjectsChange: (p: Project[]) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  // Build folder structure
  const MAX = Number.MAX_SAFE_INTEGER;
  const catMap = new Map<string, { directFiles: Project[]; subs: Map<string, Project[]> }>();
  for (const p of projects) {
    if (!catMap.has(p.category)) catMap.set(p.category, { directFiles: [], subs: new Map() });
    const g = catMap.get(p.category)!;
    if (p.subcategory?.trim()) {
      if (!g.subs.has(p.subcategory)) g.subs.set(p.subcategory, []);
      g.subs.get(p.subcategory)!.push(p);
    } else g.directFiles.push(p);
  }
  const groups = [...catMap.entries()].sort((a, b) => {
    const pa = folderOrder[a[0]] ?? MAX, pb = folderOrder[b[0]] ?? MAX;
    return pa !== pb ? pa - pb : a[0].localeCompare(b[0]);
  });

  async function doRename(category: string, subcategory: string | null) {
    if (!renameVal.trim()) return;
    const res = await renameFolderAction({ category, subcategory, newName: renameVal.trim() });
    if ("error" in res) { setMsg({ type: "error", text: res.error }); return; }
    setRenamingKey(null);
    startTransition(() => router.refresh());
  }

  async function doDelete(category: string, subcategory: string | null, count: number) {
    if (!confirm(`Delete "${subcategory ?? category}" and all ${count} item(s) inside? This cannot be undone.`)) return;
    const res = await deleteFolderAction({ category, subcategory });
    if ("error" in res) { setMsg({ type: "error", text: res.error }); return; }
    onProjectsChange(
      subcategory
        ? projects.filter((p) => !(p.category === category && p.subcategory === subcategory))
        : projects.filter((p) => p.category !== category)
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
      {msg && <p className={`font-mono text-xs ${msg.type === "error" ? "text-ember" : "text-gold-soft"}`}>{msg.text}</p>}
      {groups.length === 0 && (
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">No folders yet.</p>
      )}
      {groups.map(([category, g]) => {
        const subEntries = [...g.subs.entries()].sort((a, b) => {
          const pa = folderOrder[`${category}/${a[0]}`] ?? MAX;
          const pb = folderOrder[`${category}/${b[0]}`] ?? MAX;
          return pa !== pb ? pa - pb : a[0].localeCompare(b[0]);
        });
        const total = g.directFiles.length + subEntries.reduce((n, [, items]) => n + items.length, 0);
        const catKey = `cat:${category}`;

        return (
          <div key={category} className="rounded-2xl border border-line overflow-hidden">
            {/* Category row */}
            <div className="flex items-center justify-between gap-3 bg-ink-2/40 px-4 py-3">
              {renamingKey === catKey ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") doRename(category, null); if (e.key === "Escape") setRenamingKey(null); }}
                    className="flex-1 rounded-lg border border-gold/40 bg-ink px-3 py-1.5 text-sm text-bone outline-none focus:border-gold"
                    autoFocus
                  />
                  <button onClick={() => doRename(category, null)} className="font-mono text-[11px] text-gold hover:text-gold/80">Save</button>
                  <button onClick={() => setRenamingKey(null)} className="font-mono text-[11px] text-muted hover:text-bone">Cancel</button>
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-mono text-[12px] uppercase tracking-[0.18em] text-bone">{category}</span>
                    <span className="font-mono text-[10px] text-muted">({total})</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em]">
                    <button onClick={() => { setRenamingKey(catKey); setRenameVal(category); }} className="text-muted hover:text-gold">Rename</button>
                    <button onClick={() => doDelete(category, null, total)} className="text-muted hover:text-ember">Delete</button>
                  </div>
                </>
              )}
            </div>

            {/* Subcategory rows */}
            {subEntries.map(([sub, items]) => {
              const subKey = `sub:${category}/${sub}`;
              return (
                <div key={sub} className="flex items-center justify-between gap-3 border-t border-line/60 px-4 py-2.5 pl-8">
                  {renamingKey === subKey ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") doRename(category, sub); if (e.key === "Escape") setRenamingKey(null); }}
                        className="flex-1 rounded-lg border border-gold/40 bg-ink px-3 py-1.5 text-sm text-bone outline-none focus:border-gold"
                        autoFocus
                      />
                      <button onClick={() => doRename(category, sub)} className="font-mono text-[11px] text-gold hover:text-gold/80">Save</button>
                      <button onClick={() => setRenamingKey(null)} className="font-mono text-[11px] text-muted hover:text-bone">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-mono text-[11px] text-bone/80">{sub}</span>
                        <span className="font-mono text-[10px] text-muted">({items.length})</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em]">
                        <button onClick={() => { setRenamingKey(subKey); setRenameVal(sub); }} className="text-muted hover:text-gold">Rename</button>
                        <button onClick={() => doDelete(category, sub, items.length)} className="text-muted hover:text-ember">Delete</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ── Root ────────────────────────────────────────────────────────────────── */
export default function ManagePanel({
  projects: initial,
  categories,
  subcategories,
  folderOrder,
}: {
  projects: Project[];
  categories: string[];
  subcategories: string[];
  folderOrder: Record<string, number>;
}) {
  const [projects, setProjects] = useState(initial);
  const [tab, setTab] = useState<"projects" | "folders">("projects");

  return (
    <div className="flex w-full flex-col overflow-hidden">
      {/* Tabs */}
      <div className="mb-4 flex shrink-0 gap-1 rounded-xl border border-line bg-panel/40 p-1">
        {(["projects", "folders"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
              tab === t ? "bg-gold/15 text-gold" : "text-muted hover:text-bone"
            }`}
          >
            {t === "projects" ? `Projects (${projects.length})` : "Folders"}
          </button>
        ))}
      </div>

      {tab === "projects" ? (
        <ProjectsTab
          projects={projects}
          categories={categories}
          subcategories={subcategories}
          onProjectsChange={setProjects}
        />
      ) : (
        <FoldersTab
          projects={projects}
          folderOrder={folderOrder}
          onProjectsChange={setProjects}
        />
      )}
    </div>
  );
}
