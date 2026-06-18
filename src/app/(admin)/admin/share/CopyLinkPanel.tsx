"use client";

import { useEffect, useState } from "react";

export default function CopyLinkPanel() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.origin + "/work");
  }, []);

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-6">
      {/* Main portfolio link */}
      <div className="rounded-2xl border border-line bg-ink-2/60 p-6">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
          Portfolio URL
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 overflow-hidden rounded-xl border border-line bg-ink px-4 py-3">
            <p className="truncate font-mono text-sm text-bone">
              {url || "Loading…"}
            </p>
          </div>
          <button
            onClick={copyLink}
            disabled={!url}
            className={`shrink-0 rounded-xl border px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-40 ${
              copied
                ? "border-gold bg-gold/20 text-gold"
                : "border-gold/40 bg-gold/10 text-gold-soft hover:border-gold hover:bg-gold/20"
            }`}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Send this link to clients. They will see your full portfolio without needing to log in.
        </p>
      </div>

      {/* Open in new tab */}
      <a
        href="/work"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-xl border border-line px-5 py-4 text-sm text-muted transition-colors hover:border-gold/40 hover:text-bone"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
        </svg>
        <span>Preview portfolio as client</span>
      </a>
    </div>
  );
}
