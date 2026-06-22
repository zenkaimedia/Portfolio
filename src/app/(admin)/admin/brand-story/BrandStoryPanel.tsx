"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { FAQ } from "./actions";
import {
  saveBrandStoryAction,
  createFAQAction,
  updateFAQAction,
  deleteFAQAction,
  reorderFAQsAction,
} from "./actions";

const inputCls = "w-full rounded-xl border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/50";

type Tab = "story" | "faq";

/* ── Confirm dialog ──────────────────────────────────────────────────────── */
function ConfirmDialog({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-ink-2 p-6 shadow-2xl">
        <h3 className="mb-2 font-display text-lg font-bold text-bone">{title}</h3>
        <p className="mb-6 text-sm leading-relaxed text-muted">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-full border border-line px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-bone">Cancel</button>
          <button onClick={onConfirm} className="rounded-full border border-ember/40 bg-ember/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ember hover:bg-ember/20">Delete</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── FAQ drag ────────────────────────────────────────────────────────────── */
function useFaqDrag(faqs: FAQ[], onReorder: (ids: string[]) => void) {
  const dragId = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  function start(id: string, e: React.DragEvent) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }
  function hover(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (dragId.current !== id) setOver(id);
  }
  function drop(e: React.DragEvent, id: string) {
    e.preventDefault();
    const from = dragId.current;
    dragId.current = null; setOver(null);
    if (!from || from === id) return;
    const ids = faqs.map(f => f.id);
    const fi = ids.indexOf(from), ti = ids.indexOf(id);
    if (fi === -1 || ti === -1) return;
    const next = [...ids];
    next.splice(fi, 1); next.splice(ti, 0, from);
    onReorder(next);
  }
  function end() { dragId.current = null; setOver(null); }

  return { over, start, hover, drop, end };
}

/* ── Brand Story tab ─────────────────────────────────────────────────────── */
function BrandStoryTab({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = content !== initialContent;

  async function save() {
    setSaving(true); setErr(null);
    const res = await saveBrandStoryAction(content);
    setSaving(false);
    if ("error" in res) { setErr(res.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Write your brand narrative, mission, values, and positioning so every team member is aligned.</p>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className={`shrink-0 rounded-full border px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-40 ${
            saved ? "border-gold bg-gold/20 text-gold" : "border-gold/40 bg-gold/10 text-gold-soft hover:border-gold hover:bg-gold/20"
          }`}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      {err && <p className="font-mono text-xs text-ember">{err}</p>}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Write your brand story here...\n\nFor example:\n• Who are we and what do we do?\n• What makes us different from competitors?\n• What are our core values?\n• Who is our ideal client?\n• What results do we deliver?\n• How do we like to work with clients?`}
        className="flex-1 resize-none rounded-2xl border border-line bg-ink-2/40 p-5 text-sm leading-relaxed text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/40"
      />

      <p className="shrink-0 text-right font-mono text-[10px] text-muted">
        {content.length.toLocaleString()} characters
      </p>
    </div>
  );
}

/* ── FAQ form ────────────────────────────────────────────────────────────── */
function FAQForm({
  initial, onSave, onCancel, busy,
}: {
  initial?: { question: string; answer: string };
  onSave: (q: string, a: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [q, setQ] = useState(initial?.question ?? "");
  const [a, setA] = useState(initial?.answer ?? "");
  return (
    <div className="space-y-4 rounded-2xl border border-gold/30 bg-ink-2/60 p-5">
      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Question</label>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. What makes Zenkai Media different?" className={inputCls} autoFocus />
      </div>
      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Answer</label>
        <textarea value={a} onChange={e => setA(e.target.value)} rows={4} placeholder="Write a clear, confident answer..." className={inputCls} />
      </div>
      <div className="flex gap-3">
        <button onClick={() => onSave(q, a)} disabled={busy || !q.trim() || !a.trim()}
          className="rounded-full border border-gold/40 bg-gold/10 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-40">
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="font-mono text-xs uppercase tracking-[0.2em] text-muted hover:text-bone">Cancel</button>
      </div>
    </div>
  );
}

/* ── FAQ card ────────────────────────────────────────────────────────────── */
function FAQCard({
  faq, isDragging, isOver, onDragStart, onDragOver, onDrop, onDragEnd, onEdit, onDelete,
}: {
  faq: FAQ; isDragging: boolean; isOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      className={`rounded-2xl border border-line bg-ink-2/40 transition-all ${isDragging ? "opacity-40 scale-[0.99]" : ""} ${isOver ? "border-gold/50" : ""}`}
    >
      <div className="flex items-start gap-3 p-5">
        <span className="mt-0.5 cursor-grab select-none font-mono text-[16px] text-muted/40 hover:text-muted">⠿</span>
        <div className="flex-1 min-w-0">
          <button onClick={() => setOpen(v => !v)} className="w-full text-left">
            <p className="font-display text-base font-semibold text-bone leading-snug">{faq.question}</p>
          </button>
          <AnimatePresence>
            {open && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 overflow-hidden whitespace-pre-wrap text-sm leading-relaxed text-muted"
              >
                {faq.answer}
              </motion.p>
            )}
          </AnimatePresence>
          {!open && (
            <p className="mt-1 line-clamp-1 text-sm text-muted/60">{faq.answer}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
          <button onClick={() => setOpen(v => !v)} className="text-muted hover:text-bone">{open ? "Collapse" : "Expand"}</button>
          <button onClick={onEdit} className="text-muted hover:text-gold">Edit</button>
          <button onClick={onDelete} className="text-muted hover:text-ember">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── FAQ tab ─────────────────────────────────────────────────────────────── */
function FAQTab({ initialFaqs }: { initialFaqs: FAQ[] }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<FAQ | null>(null);

  const drag = useFaqDrag(faqs, async (ids) => {
    const reordered = ids.map(id => faqs.find(f => f.id === id)!);
    setFaqs(reordered);
    await reorderFAQsAction(ids);
  });

  async function create(q: string, a: string) {
    setBusyId("new"); setErr(null);
    const res = await createFAQAction(q, a);
    setBusyId(null);
    if ("error" in res) { setErr(res.error); return; }
    setFaqs(prev => [...prev, res.faq]);
    setShowForm(false);
  }

  async function update(id: string, q: string, a: string) {
    setBusyId(id); setErr(null);
    const res = await updateFAQAction(id, q, a);
    setBusyId(null);
    if ("error" in res) { setErr(res.error); return; }
    setFaqs(prev => prev.map(f => f.id === id ? res.faq : f));
    setEditingId(null);
  }

  async function remove(faq: FAQ) {
    const res = await deleteFAQAction(faq.id);
    if ("error" in res) { setErr(res.error); return; }
    setFaqs(prev => prev.filter(f => f.id !== faq.id));
    setConfirmDel(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{faqs.length} question{faqs.length !== 1 ? "s" : ""} — drag to reorder.</p>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditingId(null); }}
            className="rounded-full border border-gold/40 bg-gold/10 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.22em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20">
            + Add FAQ
          </button>
        )}
      </div>

      {err && <p className="shrink-0 font-mono text-xs text-ember">{err}</p>}

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {showForm && (
          <FAQForm onSave={create} onCancel={() => setShowForm(false)} busy={busyId === "new"} />
        )}

        {faqs.length === 0 && !showForm && (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-line py-16 text-center">
            <div>
              <p className="mb-1 font-display text-base font-semibold text-bone">No FAQs yet</p>
              <p className="text-sm text-muted">Add questions your team can use for sales pitches.</p>
            </div>
          </div>
        )}

        {faqs.map(faq =>
          editingId === faq.id ? (
            <FAQForm
              key={faq.id}
              initial={{ question: faq.question, answer: faq.answer }}
              onSave={(q, a) => update(faq.id, q, a)}
              onCancel={() => setEditingId(null)}
              busy={busyId === faq.id}
            />
          ) : (
            <motion.div key={faq.id} layout transition={{ type: "spring", stiffness: 400, damping: 35 }}>
              <FAQCard
                faq={faq}
                isDragging={false}
                isOver={drag.over === faq.id}
                onDragStart={(e) => drag.start(faq.id, e)}
                onDragOver={(e) => drag.hover(e, faq.id)}
                onDrop={(e) => drag.drop(e, faq.id)}
                onDragEnd={drag.end}
                onEdit={() => { setEditingId(faq.id); setShowForm(false); }}
                onDelete={() => setConfirmDel(faq)}
              />
            </motion.div>
          )
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          title={`Delete this FAQ?`}
          message={`"${confirmDel.question}" will be permanently removed.`}
          onConfirm={() => remove(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

/* ── Root panel ──────────────────────────────────────────────────────────── */
export default function BrandStoryPanel({
  initialStory, initialFaqs,
}: {
  initialStory: string;
  initialFaqs: FAQ[];
}) {
  const [tab, setTab] = useState<Tab>("story");

  return (
    <div className="flex w-full flex-col overflow-hidden">
      {/* Tabs */}
      <div className="mb-5 flex shrink-0 gap-1 rounded-xl border border-line bg-panel/40 p-1">
        {(["story", "faq"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
              tab === t ? "bg-gold/15 text-gold" : "text-muted hover:text-bone"
            }`}>
            {t === "story" ? "Brand Story" : `FAQs (${initialFaqs.length})`}
          </button>
        ))}
      </div>

      {tab === "story"
        ? <BrandStoryTab initialContent={initialStory} />
        : <FAQTab initialFaqs={initialFaqs} />
      }
    </div>
  );
}
