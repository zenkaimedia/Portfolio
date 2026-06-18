"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MessageTemplate } from "./actions";
import { createTemplateAction, updateTemplateAction, deleteTemplateAction } from "./actions";

const inputCls = "w-full rounded-xl border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/50";

/* ── New / Edit form ─────────────────────────────────────────────────────── */
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
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Template Name
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Initial Outreach"
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Hi, I wanted to share our portfolio with you…"
          className={inputCls}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onSave(title, message)}
          disabled={busy || !title.trim() || !message.trim()}
          className="rounded-full border border-gold/40 bg-gold/10 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="font-mono text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-bone"
        >
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
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(template.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="rounded-2xl border border-line bg-ink-2/60 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-bone">
          {template.title}
        </h3>
        <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
          <button onClick={onEdit} className="text-muted transition-colors hover:text-gold">
            Edit
          </button>
          <button onClick={onDelete} className="text-muted transition-colors hover:text-ember">
            Delete
          </button>
        </div>
      </div>

      <p className="mb-4 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
        {template.message}
      </p>

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
export default function MessagesPanel({
  templates: initial,
}: {
  templates: MessageTemplate[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [templates, setTemplates] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleCreate(title: string, message: string) {
    setErr(null);
    const res = await createTemplateAction(title, message);
    if ("error" in res) { setErr(res.error); return; }
    setShowForm(false);
    startTransition(() => router.refresh());
  }

  async function handleUpdate(id: string, title: string, message: string) {
    setErr(null);
    const res = await updateTemplateAction(id, title, message);
    if ("error" in res) { setErr(res.error); return; }
    setEditingId(null);
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    setErr(null);
    const res = await deleteTemplateAction(id);
    if ("error" in res) { setErr(res.error); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-5">
      {err && (
        <p className="font-mono text-xs text-ember">{err}</p>
      )}

      {/* New template button */}
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="rounded-full border border-gold/40 bg-gold/10 px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20"
        >
          + New Template
        </button>
      )}

      {/* New template form */}
      {showForm && (
        <TemplateForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          busy={pending}
        />
      )}

      {/* Template list */}
      {templates.length === 0 && !showForm && (
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          No templates yet — create your first one.
        </p>
      )}

      {templates.map((t) =>
        editingId === t.id ? (
          <TemplateForm
            key={t.id}
            initial={{ title: t.title, message: t.message }}
            onSave={(title, message) => handleUpdate(t.id, title, message)}
            onCancel={() => setEditingId(null)}
            busy={pending}
          />
        ) : (
          <TemplateCard
            key={t.id}
            template={t}
            onEdit={() => { setEditingId(t.id); setShowForm(false); }}
            onDelete={() => handleDelete(t.id)}
          />
        )
      )}
    </div>
  );
}
