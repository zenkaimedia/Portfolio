"use client";

import { useEffect } from "react";

export default function ProtectionProvider() {
  useEffect(() => {
    /* ── Block keyboard shortcuts ────────────────────────────────────────── */
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      // Block save, print, view-source, screenshot (some OS bindings)
      if (["s", "p", "u", "shift+3", "shift+4"].includes(key)) {
        e.preventDefault();
      }
    };

    /* ── Block right-click on media ──────────────────────────────────────── */
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

    /* ── Block drag ──────────────────────────────────────────────────────── */
    const onDragStart = (e: DragEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "IMG" || t.tagName === "VIDEO") {
        e.preventDefault();
      }
    };

    /* ── Block copy of media ─────────────────────────────────────────────── */
    const onCopy = (e: ClipboardEvent) => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const node = sel.anchorNode?.parentElement;
      if (node?.closest("[data-protected]")) {
        e.preventDefault();
        e.clipboardData?.clearData();
      }
    };

    /* ── Inject print-block style ────────────────────────────────────────── */
    const printStyle = document.createElement("style");
    printStyle.id = "zk-print-block";
    printStyle.textContent = `
      @media print {
        body { display: none !important; }
      }
    `;
    document.head.appendChild(printStyle);

    /* ── Blur protected content on visibility loss (mobile screenshots) ──── */
    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    const onVisibilityChange = () => {
      if (!document.hidden) return;
      // Briefly blur protected images when tab loses focus
      document.querySelectorAll<HTMLElement>("[data-protected]").forEach((el) => {
        el.style.filter = "blur(12px)";
        el.style.transition = "filter 0.1s";
      });
      blurTimer = setTimeout(() => {
        document.querySelectorAll<HTMLElement>("[data-protected]").forEach((el) => {
          el.style.filter = "";
        });
      }, 1500);
    };

    /* ── Block browser screenshot shortcut (Windows Snipping Tool etc.) ──── */
    const onKeyUp = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === "PrintScreen") {
        // Clear clipboard immediately
        navigator.clipboard.writeText("").catch(() => {});
        // Briefly blur protected content
        document.querySelectorAll<HTMLElement>("[data-protected]").forEach((el) => {
          el.style.filter = "blur(12px)";
          setTimeout(() => { el.style.filter = ""; }, 1000);
        });
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("copy", onCopy);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (blurTimer) clearTimeout(blurTimer);
      document.getElementById("zk-print-block")?.remove();
    };
  }, []);

  return null;
}
