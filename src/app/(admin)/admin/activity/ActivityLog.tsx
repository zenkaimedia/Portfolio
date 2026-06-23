"use client";

import { useState } from "react";
import type { ActivityEntry } from "./page";

const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  login:            { label: "Logged in",          color: "text-gold-soft",  icon: "→" },
  logout:           { label: "Logged out",          color: "text-muted",      icon: "←" },
  user_created:     { label: "Created user",        color: "text-gold",       icon: "+" },
  user_activated:   { label: "Activated user",      color: "text-gold-soft",  icon: "✓" },
  user_deactivated: { label: "Deactivated user",    color: "text-ember",      icon: "✕" },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const uniqueUsers = [...new Set(entries.map(e => e.user_name))];

  const filtered = entries.filter(e => {
    const matchSearch = !search || e.user_name.toLowerCase().includes(search.toLowerCase()) || e.user_email?.toLowerCase().includes(search.toLowerCase()) || e.action.includes(search.toLowerCase());
    const matchFilter = filter === "all" || e.user_name === filter;
    return matchSearch && matchFilter;
  });

  const initials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex w-full flex-col overflow-hidden">
      {/* Filters */}
      <div className="mb-4 flex shrink-0 flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search by name or action…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-4 py-2 font-mono text-sm text-bone outline-none transition-colors placeholder:text-muted/50 focus:border-gold"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs text-bone outline-none focus:border-gold"
        >
          <option value="all">All users</option>
          {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <span className="self-center font-mono text-[11px] text-muted">{filtered.length} events</span>
      </div>

      {/* Log */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-line">
        {filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">No activity found</p>
          </div>
        ) : (
          filtered.map((entry) => {
            const meta = ACTION_LABELS[entry.action] ?? { label: entry.action, color: "text-muted", icon: "·" };
            return (
              <div key={entry.id} className="flex items-start gap-4 border-b border-line/60 px-5 py-4 last:border-b-0 hover:bg-white/[0.02]">
                {/* Avatar */}
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-line font-mono text-[11px] font-bold text-muted">
                  {initials(entry.user_name)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-bone">{entry.user_name}</span>
                    <span className={`font-mono text-[11px] ${meta.color}`}>
                      {meta.icon} {meta.label}
                    </span>
                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <span className="font-mono text-[10px] text-muted/60">
                        {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(", ")}
                      </span>
                    )}
                  </div>
                  {entry.user_email && (
                    <p className="font-mono text-[10px] text-muted">{entry.user_email}</p>
                  )}
                </div>

                {/* Time */}
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[11px] text-bone">{timeAgo(entry.created_at)}</p>
                  <p className="font-mono text-[9px] text-muted">{formatDate(entry.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
