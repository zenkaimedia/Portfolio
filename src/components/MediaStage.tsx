"use client";

import type { FileNode } from "@/lib/types";
import { screenshotUrl } from "@/lib/screenshot";

/**
 * The black media area: renders the image/video/website plus the tiled
 * watermark. Shared by the mobile popup (MediaViewer) and the desktop
 * preview pane.
 */
export default function MediaStage({ file }: { file: FileNode }) {
  return (
    <div
      data-protected
      className="relative flex flex-1 items-center justify-center overflow-hidden bg-black p-2 md:p-4"
    >
      <Media file={file} />
      {file.project.type !== "website" && <Watermark />}
    </div>
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
        controlsList="nodownload"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
        className="max-h-[72vh] w-full rounded-lg object-contain"
      />
    );
  }

  if (project.type === "website") {
    return (
      // Auto-generated screenshot (works on every device, no iframe quirks).
      // The whole area is a link to the live site.
      <a
        href={project.media}
        target="_blank"
        rel="noreferrer noopener"
        title="Open site"
        className="group relative flex w-full cursor-pointer items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={project.id}
          src={screenshotUrl(project.media, 1280)}
          alt={project.title}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="max-h-[72vh] w-full select-none rounded-lg border border-line/40 bg-ink-2 object-contain"
        />
        <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-gold/40 bg-ink/85 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-gold-soft backdrop-blur transition-colors group-hover:bg-gold/20">
          Open site ↗
        </span>
      </a>
    );
  }

  /* image — transparent overlay intercepts right-click and drag */
  return (
    <div className="relative select-none">
      <div
        className="absolute inset-0 z-10"
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={project.id}
        src={project.media}
        alt={project.title}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="max-h-[72vh] w-full select-none rounded-lg object-contain"
      />
    </div>
  );
}

/**
 * Tiled, diagonal "ZENKAI MEDIA" watermark layered over the media.
 * pointer-events-none so it never blocks video controls; can't be cropped
 * out of a screenshot/screen-recording without losing part of the frame.
 */
const WATERMARK_TILE =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='280'%20height='180'%3E%3Ctext%20x='140'%20y='95'%20fill='%23ffffff'%20fill-opacity='0.08'%20font-family='monospace'%20font-size='17'%20font-weight='700'%20letter-spacing='2'%20text-anchor='middle'%20transform='rotate(-28%20140%2095)'%3EZENKAI%20MEDIA%3C/text%3E%3C/svg%3E";

function Watermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-2 z-20 select-none rounded-lg md:inset-4"
      style={{
        backgroundImage: `url("${WATERMARK_TILE}")`,
        backgroundRepeat: "repeat",
      }}
    />
  );
}
