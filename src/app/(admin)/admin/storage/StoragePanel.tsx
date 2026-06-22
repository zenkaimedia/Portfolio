"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { StorageStats, StorageFileInfo } from "./actions";
import { getStorageStatsAction, deleteFilesAction } from "./actions";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const PLAN_LIMITS: Record<string, number> = {
  "Free (1 GB)":   1 * 1024 * 1024 * 1024,
  "Pro (100 GB)": 100 * 1024 * 1024 * 1024,
  "Team (300 GB)": 300 * 1024 * 1024 * 1024,
};

const TYPE_COLORS: Record<string, string> = {
  image: "bg-gold/70",
  video: "bg-ember/70",
  pdf:   "bg-blue-400/70",
  other: "bg-muted/40",
};
const TYPE_LABELS: Record<string, string> = {
  image: "Images",
  video: "Videos",
  pdf:   "PDFs",
  other: "Other",
};

function FileIcon({ mimetype }: { mimetype: string }) {
  const e = mimetype.startsWith("image/") ? "🖼" : mimetype.startsWith("video/") ? "🎬" : mimetype === "application/pdf" ? "📄" : "📁";
  return <span>{e}</span>;
}

/* ── Usage bar ───────────────────────────────────────────────────────────── */
function UsageBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min((used / total) * 100, 100);
  const color = pct > 90 ? "bg-ember" : pct > 70 ? "bg-gold" : "bg-gold-soft";
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-line">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────────── */
export default function StoragePanel() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [plan, setPlan] = useState("Free (1 GB)");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null); setMsg(null);
    const res = await getStorageStatsAction();
    setLoading(false);
    if ("error" in res) { setErr(res.error); return; }
    setStats(res);
    setSelected(new Set());
  }

  async function deleteSelected() {
    if (!selected.size) return;
    if (!confirm(`Permanently delete ${selected.size} file(s)? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await deleteFilesAction([...selected]);
    setDeleting(false);
    if ("error" in res) { setErr(res.error); return; }
    setMsg(`Deleted ${res.deleted} file(s).`);
    setSelected(new Set());
    load();
  }

  async function deleteAllOrphaned() {
    if (!stats?.orphaned.length) return;
    if (!confirm(`Delete all ${stats.orphaned.length} orphaned files (${fmt(stats.orphanedSize)})? Cannot be undone.`)) return;
    setDeleting(true);
    const res = await deleteFilesAction(stats.orphaned.map((f) => f.path));
    setDeleting(false);
    if ("error" in res) { setErr(res.error); return; }
    setMsg(`Freed ${fmt(stats.orphanedSize)} by deleting ${res.deleted} orphaned files.`);
    load();
  }

  const limitBytes = PLAN_LIMITS[plan] ?? PLAN_LIMITS["Free (1 GB)"];

  if (!stats && !loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <div className="text-center">
          <p className="mb-2 font-display text-lg font-bold text-bone">Analyse Storage</p>
          <p className="mb-6 max-w-xs text-sm text-muted">Scans your entire Supabase bucket and calculates usage, orphaned files, and more.</p>
        </div>
        <button
          onClick={load}
          className="rounded-full border border-gold/40 bg-gold/10 px-8 py-3.5 font-mono text-xs uppercase tracking-[0.22em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20"
        >
          Analyse Storage
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        <p className="font-mono text-sm text-muted">Scanning storage… this may take a moment</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="font-mono text-sm text-ember">{err}</p>
        <button onClick={load} className="font-mono text-xs uppercase text-muted hover:text-bone">Retry</button>
      </div>
    );
  }

  if (!stats) return null;

  const pct = Math.min((stats.totalSize / limitBytes) * 100, 100);

  return (
    <div className="flex w-full gap-5 overflow-hidden">
      {/* Left sidebar ─────────────────────────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 flex-col gap-4 lg:flex">

        {/* Plan selector */}
        <div className="rounded-2xl border border-line bg-ink-2/40 p-5">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Your Supabase Plan</p>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs text-bone outline-none focus:border-gold">
            {Object.keys(PLAN_LIMITS).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {/* Usage overview */}
        <div className="rounded-2xl border border-line bg-ink-2/40 p-5">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Storage Used</p>
          <div className="mb-3">
            <UsageBar used={stats.totalSize} total={limitBytes} />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-2xl font-bold text-bone">{fmt(stats.totalSize)}</p>
              <p className="font-mono text-[10px] text-muted">of {fmt(limitBytes)}</p>
            </div>
            <p className={`font-mono text-lg font-bold ${pct > 90 ? "text-ember" : pct > 70 ? "text-gold" : "text-gold-soft"}`}>
              {pct.toFixed(1)}%
            </p>
          </div>
          <div className="mt-3 border-t border-line pt-3 font-mono text-[11px] text-muted">
            Free: {fmt(Math.max(0, limitBytes - stats.totalSize))} remaining
          </div>
        </div>

        {/* Quick stats */}
        <div className="rounded-2xl border border-line bg-ink-2/40 p-5 space-y-3">
          {[
            { label: "Total files", value: stats.totalFiles.toLocaleString() },
            { label: "Orphaned files", value: stats.orphaned.length.toString(), warn: stats.orphaned.length > 0 },
            { label: "Wasted space", value: fmt(stats.orphanedSize), warn: stats.orphanedSize > 0 },
          ].map(({ label, value, warn }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted">{label}</span>
              <span className={`font-mono text-[12px] font-semibold ${warn ? "text-ember" : "text-bone"}`}>{value}</span>
            </div>
          ))}
        </div>

        <button onClick={load} className="rounded-xl border border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors hover:border-gold/40 hover:text-bone">
          ↺ Refresh
        </button>
      </aside>

      {/* Main content ────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {msg && <p className="shrink-0 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 font-mono text-xs text-gold-soft">{msg}</p>}
        {err && <p className="font-mono text-xs text-ember">{err}</p>}

        {/* Type breakdown ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-line bg-ink-2/40 p-5">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Breakdown by Type</p>
          <div className="mb-4 flex h-4 overflow-hidden rounded-full">
            {(["image", "video", "pdf", "other"] as const).map((k) => {
              const pct = stats.totalSize > 0 ? (stats.breakdown[k].size / stats.totalSize) * 100 : 0;
              return pct > 0 ? (
                <motion.div key={k} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: "easeOut" }} className={`h-full ${TYPE_COLORS[k]}`} title={`${TYPE_LABELS[k]}: ${pct.toFixed(1)}%`} />
              ) : null;
            })}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["image", "video", "pdf", "other"] as const).map((k) => (
              <div key={k} className="rounded-xl bg-ink/40 p-3">
                <div className={`mb-1.5 h-2 w-8 rounded-full ${TYPE_COLORS[k]}`} />
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{TYPE_LABELS[k]}</p>
                <p className="font-mono text-sm font-bold text-bone">{fmt(stats.breakdown[k].size)}</p>
                <p className="font-mono text-[10px] text-muted">{stats.breakdown[k].count} files</p>
              </div>
            ))}
          </div>
        </div>

        {/* Orphaned files ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-line bg-ink-2/40 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Orphaned Files</p>
              <p className="mt-0.5 text-xs text-muted">Files in storage with no linked project — safe to delete.</p>
            </div>
            {stats.orphaned.length > 0 && (
              <button onClick={deleteAllOrphaned} disabled={deleting} className="shrink-0 rounded-full border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-ember transition-colors hover:bg-ember/20 disabled:opacity-40">
                {deleting ? "Deleting…" : `Delete all (${fmt(stats.orphanedSize)})`}
              </button>
            )}
          </div>
          {stats.orphaned.length === 0 ? (
            <p className="font-mono text-xs text-gold-soft">✓ No orphaned files — storage is clean!</p>
          ) : (
            <div className="max-h-60 overflow-y-auto rounded-xl border border-line">
              {stats.orphaned.map((f) => (
                <div key={f.path} className="flex items-center gap-3 border-b border-line/60 px-4 py-2.5 last:border-b-0 hover:bg-white/[0.02]">
                  <span className={`grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded border transition-colors ${selected.has(f.path) ? "border-gold bg-gold text-ink" : "border-line"}`}
                    onClick={() => setSelected((prev) => { const n = new Set(prev); n.has(f.path) ? n.delete(f.path) : n.add(f.path); return n; })}>
                    {selected.has(f.path) && "✓"}
                  </span>
                  <FileIcon mimetype={f.mimetype} />
                  <span className="flex-1 truncate font-mono text-[11px] text-bone/70">{f.path}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted">{fmt(f.size)}</span>
                </div>
              ))}
            </div>
          )}
          {selected.size > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <button onClick={deleteSelected} disabled={deleting} className="rounded-full border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-ember transition-colors hover:bg-ember/20 disabled:opacity-40">
                {deleting ? "Deleting…" : `Delete ${selected.size} selected`}
              </button>
              <button onClick={() => setSelected(new Set())} className="font-mono text-[11px] text-muted hover:text-bone">Clear</button>
            </div>
          )}
        </div>

        {/* Largest files ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-line bg-ink-2/40 p-5">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Largest Files</p>
          <div className="rounded-xl border border-line overflow-hidden">
            {stats.largest.map((f, i) => {
              const barPct = stats.largest[0]?.size > 0 ? (f.size / stats.largest[0].size) * 100 : 0;
              return (
                <div key={f.path} className="relative flex items-center gap-3 border-b border-line/60 px-4 py-3 last:border-b-0">
                  <div className="absolute inset-0 origin-left opacity-10" style={{ background: "var(--color-gold)", transform: `scaleX(${barPct / 100})` }} />
                  <span className="w-5 shrink-0 font-mono text-[10px] text-muted">{i + 1}</span>
                  <FileIcon mimetype={f.mimetype} />
                  <span className="flex-1 truncate font-mono text-[11px] text-bone/80">{f.path}</span>
                  <span className={`shrink-0 font-mono text-[12px] font-semibold ${f.size > 50 * 1024 * 1024 ? "text-ember" : f.size > 10 * 1024 * 1024 ? "text-gold" : "text-bone"}`}>
                    {fmt(f.size)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
