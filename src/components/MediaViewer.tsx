"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { FileNode } from "@/lib/types";
import { CloseIcon, ChevronRight } from "./ui/icons";
import { transformImage } from "@/lib/image";
import { screenshotUrl } from "@/lib/screenshot";

const WATERMARK_TILE =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='280'%20height='180'%3E%3Ctext%20x='140'%20y='95'%20fill='%23ffffff'%20fill-opacity='0.08'%20font-family='monospace'%20font-size='17'%20font-weight='700'%20letter-spacing='2'%20text-anchor='middle'%20transform='rotate(-28%20140%2095)'%3EZENKAI%20MEDIA%3C/text%3E%3C/svg%3E";

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "50%" : "-50%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-50%" : "50%", opacity: 0 }),
};

export default function MediaViewer({
  file,
  onClose,
  onPrev,
  onNext,
  total = 1,
}: {
  file: FileNode;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  index?: number;
  total?: number;
}) {
  const [direction, setDirection] = useState(0);
  const canSwipe = total > 1;

  // Swipe-down-to-close (mobile)
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const goNext = () => { if (onNext) { setDirection(1); onNext(); } };
  const goPrev = () => { if (onPrev) { setDirection(-1); onPrev(); } };

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

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const dx = Math.abs(e.changedTouches[0].clientX - touchStartX.current);
    touchStartY.current = null;
    touchStartX.current = null;
    // Close only when swipe is clearly downward (more vertical than horizontal)
    if (dy > 100 && dy > dx) onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
        className="absolute right-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
      >
        <CloseIcon />
      </button>

      {/* Sliding media — no onClick here so empty-area clicks reach the backdrop */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={file.project.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 32 },
            opacity: { duration: 0.15 },
          }}
          drag={canSwipe ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_, info) => {
            if (info.offset.x <= -70) goNext();
            else if (info.offset.x >= 70) goPrev();
          }}
          className="absolute inset-0 flex items-center justify-center px-3 py-16 md:px-20 md:py-12"
        >
          {/* Only the media itself stops propagation — empty padding area stays clickable to close */}
          <div onClick={(e) => e.stopPropagation()}>
            <MediaContent file={file} />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Side arrows */}
      {canSwipe && (
        <>
          <NavArrow side="left" onClick={goPrev} disabled={!onPrev} />
          <NavArrow side="right" onClick={goNext} disabled={!onNext} />
        </>
      )}
    </motion.div>
  );
}

function MediaContent({ file }: { file: FileNode }) {
  const { project } = file;

  if (project.type === "video") {
    return (
      <video
        key={project.id}
        src={project.media}
        controls
        autoPlay
        playsInline
        controlsList="nodownload"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
        className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
      />
    );
  }

  if (project.type === "website") {
    return (
      <a
        href={project.media}
        target="_blank"
        rel="noreferrer noopener"
        title="Open site"
        onClick={(e) => e.stopPropagation()}
        className="group relative block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl(project.media, 1280)}
          alt={project.title}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
        />
        <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-gold/40 bg-ink/85 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-gold-soft backdrop-blur transition-colors group-hover:bg-gold/20">
          Open site ↗
        </span>
      </a>
    );
  }

  return (
    <div
      data-protected
      className="relative select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 z-10" onContextMenu={(e) => e.preventDefault()} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={project.id}
        src={transformImage(project.media, 1600, 85)}
        alt={project.title}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="max-h-[82vh] w-full rounded-xl object-contain shadow-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 select-none rounded-xl"
        style={{
          backgroundImage: `url("${WATERMARK_TILE}")`,
          backgroundRepeat: "repeat",
        }}
      />
    </div>
  );
}

function NavArrow({
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
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      disabled={disabled}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={`absolute top-1/2 z-50 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-0 ${
        side === "left" ? "left-3 md:left-5" : "right-3 md:right-5"
      }`}
    >
      <span className={side === "left" ? "rotate-180" : ""}>
        <ChevronRight />
      </span>
    </button>
  );
}
