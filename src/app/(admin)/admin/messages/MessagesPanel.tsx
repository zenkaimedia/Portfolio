"use client";

import { useEffect, useRef, useState } from "react";
import type { MessageTemplate } from "./actions";
import { createTemplateAction, updateTemplateAction, deleteTemplateAction } from "./actions";

const inputCls =
  "w-full rounded-xl border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/50";

/* ── Sidebar item with hover tooltip ────────────────────────────────────── */
function SidebarItem({
  template,
  selected,
  onClick,
}: {
  template: MessageTemplate;
  selected: boolean;
  onClick: () => void;
}) {
  const [tooltip, setTooltip] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function enter() { timer.current = setTimeout(() => setTooltip(true), 700); }
  function leave() { if (timer.current) clearTimeout(timer.current); setTooltip(false); }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
          selected ? "bg-gold/15 text-gold" : "text-bone/70 hover:bg-white/5 hover:text-bone"
        }`}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
        <span className="truncate text-[13px]">{template.title}</span>
      </button>

      {/* Tooltip: full message preview */}
      {tooltip && (
        <div className="pointer-events-none absolute left-full top-0 z-50 ml-3 w-72 max-h-48 overflow-y-auto rounded-xl border border-line bg-ink-2 p-4 shadow-2xl">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{template.title}</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-bone">{template.message}</p>
        </div>
      )}
    </div>
  );
}

/* ── Message preview with hover-to-reveal ───────────────────────────────── */
function MessagePreview({ message }: { message: string }) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function enter() { timer.current = setTimeout(() => setShow(true), 400); }
  function leave() { if (timer.current) clearTimeout(timer.current); setShow(false); }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      {/* Truncated preview — only first 2 lines */}
      <p className="line-clamp-2 cursor-default text-sm leading-relaxed text-muted">{message}</p>

      {/* Full message tooltip on hover */}
      {show && (
        <div className="absolute left-0 right-0 top-0 z-40 max-h-48 overflow-y-auto rounded-xl border border-line bg-ink-2/98 p-4 shadow-2xl backdrop-blur-sm">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-bone">{message}</p>
        </div>
      )}
    </div>
  );
}

/* ── Form ────────────────────────────────────────────────────────────────── */
function TemplateForm({
  initial,
  onSave,
  onCancel,
  busy,
}: {
  initial?: { title: string; message: string };
  onSave: (title: string, message: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");

  return (
    <div className="space-y-4 rounded-2xl border border-gold/30 bg-ink-2/60 p-5">
      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Template Name</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Initial Outreach" className={inputCls} autoFocus />
      </div>
      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Hi, I wanted to share our portfolio with you…" className={inputCls} />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onSave(title, message)}
          disabled={busy || !title.trim() || !message.trim()}
          className="rounded-full border border-gold/40 bg-gold/10 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="font-mono text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-bone">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Template card ───────────────────────────────────────────────────────── */
function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: MessageTemplate;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(template.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div id={`tpl-${template.id}`} className="scroll-mt-2 rounded-2xl border border-line bg-ink-2/60 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-bone">{template.title}</h3>
        <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
          {onEdit && <button onClick={onEdit} className="text-muted transition-colors hover:text-gold">Edit</button>}
          {onDelete && <button onClick={onDelete} className="text-muted transition-colors hover:text-ember">Delete</button>}
        </div>
      </div>

      {/* Message — truncated, reveals full on hover */}
      <div className="mb-4">
        <MessagePreview message={template.message} />
      </div>

      <button
        onClick={copy}
        className={`rounded-xl border px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] transition-all ${
          copied
            ? "border-gold bg-gold/20 text-gold"
            : "border-gold/40 bg-gold/10 text-gold-soft hover:border-gold hover:bg-gold/20"
        }`}
      >
        {copied ? "Copied ✓" : "Copy Message"}
      </button>
    </div>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────────── */
export default function MessagesPanel({ templates: initial, canManage = true }: { templates: MessageTemplate[]; canManage?: boolean }) {
  const [templates, setTemplates] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = templates.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  function scrollTo(id: string) {
    setSelectedId(id);
    document.getElementById(`tpl-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleCreate(title: string, message: string) {
    setErr(null); setBusy(true);
    const res = await createTemplateAction(title, message);
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    setTemplates((prev) => [res.template, ...prev]);
    setShowForm(false);
    setSelectedId(res.template.id);
    setTimeout(() => scrollTo(res.template.id), 50);
  }

  async function handleUpdate(id: string, title: string, message: string) {
    setErr(null); setBusy(true);
    const res = await updateTemplateAction(id, title, message);
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    setTemplates((prev) => prev.map((t) => (t.id === id ? res.template : t)));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    setErr(null);
    const res = await deleteTemplateAction(id);
    if ("error" in res) { setErr(res.error); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="flex w-full gap-5 overflow-hidden">
      {/* ── Left sidebar — own scroller ──────────────────────────────────── */}
      <aside className="hidden w-52 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-ink-2/40 lg:flex">
        {/* Search */}
        <div className="shrink-0 border-b border-line p-3">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs text-bone outline-none transition-colors placeholder:text-muted/50 focus:border-gold"
          />
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              {templates.length === 0 ? "No templates yet" : "No matches"}
            </p>
          ) : (
            filtered.map((t) => (
              <SidebarItem
                key={t.id}
                template={t}
                selected={selectedId === t.id}
                onClick={() => scrollTo(t.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Main content — own scroller ──────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile search */}
        <div className="mb-4 shrink-0 lg:hidden">
          <input
            type="text"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-line bg-ink px-4 py-2.5 font-mono text-sm text-bone outline-none transition-colors placeholder:text-muted/50 focus:border-gold"
          />
        </div>

        {err && <p className="mb-3 shrink-0 font-mono text-xs text-ember">{err}</p>}

        {!showForm && canManage && (
          <div className="mb-4 shrink-0">
            <button
              onClick={() => { setShowForm(true); setEditingId(null); }}
              className="rounded-full border border-gold/40 bg-gold/10 px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20"
            >
              + New Template
            </button>
          </div>
        )}

        {/* Scrollable cards */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {showForm && (
            <TemplateForm onSave={handleCreate} onCancel={() => setShowForm(false)} busy={busy} />
          )}

          {templates.length === 0 && !showForm && (
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              No templates yet — create your first one.
            </p>
          )}

          {filtered.map((t) =>
            editingId === t.id ? (
              <TemplateForm
                key={t.id}
                initial={{ title: t.title, message: t.message }}
                onSave={(title, message) => handleUpdate(t.id, title, message)}
                onCancel={() => setEditingId(null)}
                busy={busy}
              />
            ) : (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={canManage ? () => { setEditingId(t.id); setShowForm(false); } : undefined}
                onDelete={canManage ? () => handleDelete(t.id) : undefined}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
