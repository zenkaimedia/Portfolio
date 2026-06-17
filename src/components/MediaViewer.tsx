"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { FileNode } from "@/lib/types";
import { CloseIcon, ChevronRight } from "./ui/icons";
import MediaStage from "./MediaStage";

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

export default function MediaViewer({
  file,
  trail,
  onClose,
  onPrev,
  onNext,
  index = 0,
  total = 1,
}: {
  file: FileNode;
  trail: string[];
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  index?: number;
  total?: number;
}) {
  const [direction, setDirection] = useState(0);
  const canSwipe = total > 1;

  const goNext = () => {
    if (onNext) {
      setDirection(1);
      onNext();
    }
  };
  const goPrev = () => {
    if (onPrev) {
      setDirection(-1);
      onPrev();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/85 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Static card frame (open pop); content slides inside it */}
      <motion.div
        className="relative z-10 h-full w-full max-w-6xl overflow-hidden rounded-2xl border border-line bg-ink-2/90 shadow-2xl md:h-auto md:max-h-full"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={file.project.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 320, damping: 34 },
              opacity: { duration: 0.18 },
            }}
            drag={canSwipe ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.22}
            onDragEnd={(_, info) => {
              const threshold = 70;
              if (info.offset.x <= -threshold) goNext();
              else if (info.offset.x >= threshold) goPrev();
            }}
            className="absolute inset-0 flex touch-pan-y flex-col overflow-y-auto md:relative"
          >
            <MediaStage file={file} />
            <Meta file={file} trail={trail} />
          </motion.div>
        </AnimatePresence>

        {/* Fixed controls — layered above the sliding content */}
        <div className="pointer-events-none absolute inset-0 z-40">
          <button
            onClick={onClose}
            aria-label="Close"
            className="pointer-events-auto absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-line bg-ink/70 text-bone backdrop-blur transition-colors hover:border-gold hover:text-gold"
          >
            <CloseIcon />
          </button>

          {total > 1 && (
            <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-line bg-ink/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-bone backdrop-blur">
              {index + 1} / {total}
            </span>
          )}

          {canSwipe && (
            <>
              <EdgeButton side="left" onClick={goPrev} disabled={!onPrev} />
              <EdgeButton side="right" onClick={goNext} disabled={!onNext} />
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Meta({
  file,
  trail,
}: {
  file: FileNode;
  trail: string[];
}) {
  const { project } = file;
  return (
    <aside className="flex shrink-0 flex-col gap-3 border-t border-line p-5">
      <span className="w-fit rounded-full border border-gold/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-gold-soft">
        {project.type}
      </span>
      {trail.length > 0 && (
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          {trail.join("  ·  ")}
        </p>
      )}
      <h2 className="font-display text-xl font-bold leading-tight text-bone">
        {project.title}
      </h2>
      {project.description && (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted">
          {project.description}
        </p>
      )}
    </aside>
  );
}

function EdgeButton({
  side,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={`pointer-events-auto absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink/70 text-bone backdrop-blur transition-opacity ${
        side === "left" ? "left-2" : "right-2"
      } ${disabled ? "pointer-events-none opacity-20" : "opacity-80 hover:opacity-100"}`}
    >
      <span className={side === "left" ? "rotate-180" : ""}>
        <ChevronRight />
      </span>
    </button>
  );
}
