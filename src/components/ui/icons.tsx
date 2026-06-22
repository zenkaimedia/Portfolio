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
  if (type === "pdf") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" />
      </svg>
    );
  }
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

export function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" {...base}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" {...base}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function StorageIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export function CompressIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
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

