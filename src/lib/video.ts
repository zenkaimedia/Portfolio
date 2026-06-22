/** Detect the provider of a video URL. */
export function getVideoProvider(url: string): "youtube" | "vimeo" | "native" {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  return "native";
}

export function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([^&?/\s]+)/);
  return m?.[1] ?? null;
}

export function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] ?? null;
}

/** Returns the embed URL for YouTube/Vimeo, or null for native video. */
export function getEmbedUrl(url: string): string | null {
  const p = getVideoProvider(url);
  if (p === "youtube") {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
  }
  if (p === "vimeo") {
    const id = getVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
  }
  return null;
}

/** Returns a static thumbnail URL for the video, if available. */
export function getVideoThumbnail(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
