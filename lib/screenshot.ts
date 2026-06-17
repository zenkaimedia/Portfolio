/**
 * Auto-generated website screenshot via WordPress.com's free mShots service
 * (no API key). Works identically on mobile and desktop since it's just an
 * image. The first request for a brand-new URL may return a "generating"
 * placeholder; it's cached and resolves to the real screenshot shortly after.
 */
export function screenshotUrl(siteUrl: string, width = 1280): string {
  const w = Math.round(width);
  const h = Math.round((w * 3) / 4); // 4:3 above-the-fold capture
  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(siteUrl)}?w=${w}&h=${h}`;
}
