"use client";

import { useEffect, useRef, useState } from "react";

/* ── Sidebar item with URL tooltip on hover ─────────────────────────────── */
function SidebarItem({
  category,
  url,
  selected,
  onClick,
}: {
  category: { name: string; slug: string };
  url: string;
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
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="truncate text-[13px]">{category.name}</span>
      </button>

      {tooltip && (
        <div className="pointer-events-none absolute left-full top-0 z-50 ml-3 w-72 rounded-xl border border-line bg-ink-2 p-4 shadow-2xl">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{category.name}</p>
          <p className="break-all font-mono text-xs text-bone/80">{url}</p>
        </div>
      )}
    </div>
  );
}

/* ── Category card ───────────────────────────────────────────────────────── */
function CategoryCard({ category, path }: { category: { name: string; slug: string }; path: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const url = origin ? origin + path : "";

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div id={`cat-${category.slug}`} className="scroll-mt-2 rounded-2xl border border-line bg-ink-2/60 p-5">
      <h3 className="mb-3 font-display text-base font-semibold text-bone">{category.name}</h3>

      <div className="mb-4 overflow-hidden rounded-lg border border-line bg-ink px-4 py-2.5">
        <p className="truncate font-mono text-xs text-bone/70">{url || "Loading…"}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={copy}
          disabled={!url}
          className={`rounded-xl border px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] transition-all disabled:opacity-40 ${
            copied
              ? "border-gold bg-gold/20 text-gold"
              : "border-gold/40 bg-gold/10 text-gold-soft hover:border-gold hover:bg-gold/20"
          }`}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-line px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors hover:border-gold/40 hover:text-bone"
        >
          Visit
        </a>
      </div>
    </div>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────────── */
export default function CopyLinkPanel({
  categories,
}: {
  categories: { name: string; slug: string }[];
}) {
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  function scrollTo(slug: string) {
    setSelectedSlug(slug);
    document.getElementById(`cat-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex w-full gap-5 overflow-hidden">
      {/* ── Sidebar — own scroller ─────────────────────────────────────── */}
      <aside className="hidden w-52 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-ink-2/40 lg:flex">
        <div className="shrink-0 border-b border-line p-3">
          <input
            type="text"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs text-bone outline-none transition-colors placeholder:text-muted/50 focus:border-gold"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              {categories.length === 0 ? "No categories yet" : "No matches"}
            </p>
          ) : (
            filtered.map((cat) => (
              <SidebarItem
                key={cat.slug}
                category={cat}
                url={origin ? `${origin}/${cat.slug}` : ""}
                selected={selectedSlug === cat.slug}
                onClick={() => scrollTo(cat.slug)}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Cards — own scroller ───────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile search */}
        <div className="mb-4 shrink-0 lg:hidden">
          <input
            type="text"
            placeholder="Search categories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-line bg-ink px-4 py-2.5 font-mono text-sm text-bone outline-none transition-colors placeholder:text-muted/50 focus:border-gold"
          />
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              {categories.length === 0 ? "No categories yet — add projects first." : "No matches found."}
            </p>
          ) : (
            filtered.map((cat) => (
              <CategoryCard
                key={cat.slug}
                category={cat}
                path={`/${cat.slug}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
