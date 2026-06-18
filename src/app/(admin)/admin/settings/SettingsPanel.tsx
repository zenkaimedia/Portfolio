"use client";

import { useEffect, useState } from "react";

/* ── Section wrapper ─────────────────────────────────────────────────────── */
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-1 font-display text-base font-semibold text-bone">{title}</h2>
      {description && <p className="mb-4 text-sm text-muted">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  );
}

/* ── Theme cards ─────────────────────────────────────────────────────────── */
function ThemeCard({
  mode, current, onSelect,
}: { mode: "light" | "dark"; current: "light" | "dark"; onSelect: () => void }) {
  const active = current === mode;
  return (
    <button
      onClick={onSelect}
      className={`relative w-full overflow-hidden rounded-2xl border-2 transition-all ${
        active ? "border-gold" : "border-line hover:border-muted"
      }`}
    >
      {/* Mini UI preview */}
      <div className={`p-3 ${mode === "light" ? "bg-[#faf8f5]" : "bg-[#0a0a0b]"}`}>
        {/* Fake header */}
        <div className={`mb-2.5 flex items-center gap-2 rounded-lg px-3 py-2 ${mode === "light" ? "bg-[#e6e1db]" : "bg-[#16161a]"}`}>
          <div className={`h-2 w-2 rounded-full ${mode === "light" ? "bg-[#cec8c0]" : "bg-[#26262c]"}`} />
          <div className={`h-1.5 w-16 rounded ${mode === "light" ? "bg-[#cec8c0]" : "bg-[#26262c]"}`} />
        </div>
        {/* Fake grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`aspect-[4/3] rounded ${mode === "light" ? "bg-[#e6e1db]" : "bg-[#16161a]"}`} />
          ))}
        </div>
      </div>
      {/* Label */}
      <div className={`flex items-center justify-between px-4 py-3 ${mode === "light" ? "bg-[#f0ece8]" : "bg-[#111113]"}`}>
        <span className={`font-mono text-[11px] uppercase tracking-[0.18em] ${mode === "light" ? "text-[#1c1916]" : "text-[#ece7df]"}`}>
          {mode === "light" ? "Light" : "Dark"}
        </span>
        {active && (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-gold text-ink text-[10px]">✓</span>
        )}
      </div>
    </button>
  );
}

/* ── Toggle row ──────────────────────────────────────────────────────────── */
function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-ink-2/40 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-bone">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-gold" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/* ── Info row ────────────────────────────────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-ink-2/40 px-5 py-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-mono text-sm text-bone">{value}</span>
    </div>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────────── */
export default function SettingsPanel() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [watermark, setWatermark] = useState(true);
  const [smoothAnimation, setSmoothAnimation] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("zk-theme") as "light" | "dark" | null;
    setTheme(stored ?? (document.documentElement.classList.contains("light") ? "light" : "dark"));
    setWatermark(localStorage.getItem("zk-watermark") !== "false");
    setSmoothAnimation(localStorage.getItem("zk-animation") !== "false");
  }, []);

  function applyTheme(mode: "light" | "dark") {
    setTheme(mode);
    localStorage.setItem("zk-theme", mode);
    document.documentElement.classList.toggle("light", mode === "light");
  }

  function toggleWatermark(val: boolean) {
    setWatermark(val);
    localStorage.setItem("zk-watermark", String(val));
  }

  function toggleAnimation(val: boolean) {
    setSmoothAnimation(val);
    localStorage.setItem("zk-animation", String(val));
  }

  return (
    <div className="space-y-2">

      {/* Appearance */}
      <Section title="Appearance" description="Choose how the admin panel looks.">
        <div className="grid grid-cols-2 gap-3">
          <ThemeCard mode="light" current={theme} onSelect={() => applyTheme("light")} />
          <ThemeCard mode="dark" current={theme} onSelect={() => applyTheme("dark")} />
        </div>
      </Section>

      <div className="hairline h-px w-full" />

      {/* Portfolio */}
      <Section title="Portfolio" description="Settings that affect how your portfolio is displayed to clients.">
        <div className="space-y-3">
          <ToggleRow
            label="Image Watermark"
            description="Show ZENKAI MEDIA watermark over images in the viewer."
            checked={watermark}
            onChange={toggleWatermark}
          />
          <ToggleRow
            label="Smooth Animations"
            description="Enable entrance and transition animations across the portfolio."
            checked={smoothAnimation}
            onChange={toggleAnimation}
          />
        </div>
      </Section>

      <div className="hairline h-px w-full" />

      {/* About */}
      <Section title="About">
        <div className="space-y-2">
          <InfoRow label="Framework" value="Next.js 15" />
          <InfoRow label="Database" value="Supabase" />
          <InfoRow label="Styling" value="Tailwind CSS v4" />
        </div>
      </Section>

    </div>
  );
}
