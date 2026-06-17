import type { ProjectType } from "@/lib/types";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function FolderIcon({ open = false }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      {open ? (
        <path d="M3.5 7.5h5l2 2.2h8a1.5 1.5 0 0 1 1.46 1.86l-1.2 5.2A2 2 0 0 1 16.8 19.5H5a2 2 0 0 1-2-2V7.5z" />
      ) : (
        <path d="M3.5 6.8a1.5 1.5 0 0 1 1.5-1.5h4l2 2.2h7.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V6.8z" />
      )}
    </svg>
  );
}

export function FileIcon({ type }: { type: ProjectType }) {
  if (type === "video") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
        <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
        <path d="M10 9.2l4.5 2.8-4.5 2.8z" fill="currentColor" stroke="none" />
        <path d="M3.5 9h17M7.2 5.5v3.5M16.8 5.5v3.5" opacity="0.5" />
      </svg>
    );
  }
  if (type === "website") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
        <circle cx="12" cy="12" r="8.2" />
        <path d="M3.8 12h16.4M12 3.8c2.4 2.2 2.4 14.2 0 16.4M12 3.8c-2.4 2.2-2.4 14.2 0 16.4" opacity="0.7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      <rect x="3.8" y="5.5" width="16.4" height="13" rx="2" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="M5 16.5l4-3.6 3 2.4 3-2.8 4 4" />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" {...base}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base}>
      <circle cx="11" cy="11" r="6.4" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" {...base}>
      <path d="M14 5h5v5M19 5l-8 8M11 5H6a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 6 19h11a1.5 1.5 0 0 0 1.5-1.5V13" />
    </svg>
  );
}

