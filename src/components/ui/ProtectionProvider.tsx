"use client";

import { useEffect } from "react";

export default function ProtectionProvider() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      // Block save, print, view-source
      if (key === "s" || key === "p" || key === "u") {
        e.preventDefault();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (
        t.tagName === "IMG" ||
        t.tagName === "VIDEO" ||
        t.closest("[data-protected]")
      ) {
        e.preventDefault();
      }
    };

    const onDragStart = (e: DragEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "IMG" || t.tagName === "VIDEO") {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("dragstart", onDragStart);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return null;
}
