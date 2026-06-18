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
      <div className="flex items-center gap-3">
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
      </div>
    </div>
  );
}

export default function CopyLinkPanel({
  categories,
}: {
  categories: { name: string; slug: string }[];
}) {
  return (
    <div className="space-y-4">
      {/* Full portfolio link */}
      <CopyRow label="Full Portfolio" path="/work" />

      {/* Per-category links */}
      {categories.length > 0 && (
        <>
          <p className="pt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
            By Category
          </p>
          {categories.map((cat) => (
            <CopyRow
              key={cat.slug}
              label={cat.name}
              path={`/work/${cat.slug}`}
            />
          ))}
        </>
      )}

      {categories.length === 0 && (
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          No categories yet — add projects first.
        </p>
      )}
    </div>
  );
}
