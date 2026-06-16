"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import type { FileNode } from "@/lib/types";
import { CloseIcon, ExternalIcon } from "./icons";

export default function MediaViewer({
  file,
  trail,
  urlPath,
  onClose,
}: {
  file: FileNode;
  trail: string[];
  urlPath: string;
  onClose: () => void;
}) {
  const { project } = file;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/85 backdrop-blur-xl"
        onClick={onClose}
      />

      <motion.div
        className="relative z-10 flex max-h-full w-full max-w-6xl flex-col overflow-y-auto rounded-2xl border border-line bg-ink-2/90 shadow-2xl md:flex-row md:overflow-hidden"
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
      >
        {/* Media stage */}
        <div className="relative flex flex-1 items-center justify-center bg-black p-2 md:p-4">
          <Media file={file} />
        </div>

        {/* Meta rail */}
        <aside className="flex w-full shrink-0 flex-col gap-5 border-t border-line p-6 md:w-[320px] md:border-l md:border-t-0 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-gold/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-gold-soft">
              {project.type}
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-gold hover:text-gold"
            >
              <CloseIcon />
            </button>
          </div>

          {trail.length > 0 && (
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
              {trail.join("  ·  ")}
            </p>
          )}

          <h2 className="font-display text-2xl font-bold leading-tight text-bone">
            {project.title}
          </h2>

          {project.description && (
            <p className="text-sm leading-relaxed text-muted">
              {project.description}
            </p>
          )}

          <a
            href={project.media}
            target="_blank"
            rel="noreferrer"
            className="mt-auto inline-flex items-center gap-2 self-start rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bone/80 transition-colors hover:border-gold hover:text-gold"
          >
            Open original <ExternalIcon />
          </a>

          <p className="truncate font-mono text-[10px] text-muted/70" title={urlPath}>
            {urlPath}
          </p>
        </aside>
      </motion.div>
    </motion.div>
  );
}

function Media({ file }: { file: FileNode }) {
  const { project } = file;

  if (project.type === "video") {
    return (
      <video
        key={project.id}
        src={project.media}
        controls
        autoPlay
        playsInline
        className="max-h-[72vh] w-full rounded-lg object-contain"
      />
    );
  }

  if (project.type === "website") {
    return (
      <iframe
        key={project.id}
        src={project.media}
        title={project.title}
        className="h-[72vh] w-full rounded-lg border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    );
  }

  /* image */
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={project.id}
      src={project.media}
      alt={project.title}
      className="max-h-[72vh] w-full rounded-lg object-contain"
    />
  );
}
