"use client";

import { useEffect, useState } from "react";

function CopyRow({ label, path }: { label: string; path: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? origin + path : "";

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="rounded-xl border border-line bg-ink-2/60 p-4">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 overflow-hidden rounded-lg border border-line bg-ink px-4 py-2.5">
          <p className="truncate font-mono text-xs text-bone/80">
            {url || "Loading…"}
          </p>
        </div>
        <button
          onClick={copy}
          disabled={!url}
          className={`shrink-0 rounded-lg border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-all disabled:opacity-40 ${
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
          className="shrink-0 rounded-lg border border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors hover:border-gold/40 hover:text-bone"
        >
          Visit
        </a>
      </div>
    </div>
  );
}

export default function CopyLinkPanel({
  categories,
}: {
  categories: { name: string; slug: string }[];
}) {
  const [query, setQuery] = useState("");

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search categories…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xl border border-line bg-ink px-4 py-3 font-mono text-sm text-bone outline-none transition-colors placeholder:text-muted/50 focus:border-gold"
      />

      {/* Category links */}
      {filtered.length > 0 ? (
        filtered.map((cat) => (
          <CopyRow
            key={cat.slug}
            label={cat.name}
            path={`/work/${cat.slug}`}
          />
        ))
      ) : (
        <p className="py-4 text-center font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {categories.length === 0 ? "No categories yet — add projects first." : "No matches found."}
        </p>
      )}
    </div>
  );
}
