/**
 * Convert a Supabase Storage object URL into a resized render URL.
 * Non-Supabase URLs (external links, screenshots) pass through unchanged.
 *
 * Supabase automatically serves WebP/AVIF when the browser supports it.
 */
export function transformImage(
  url: string,
  width: number,
  quality = 80
): string {
  if (!url.includes("/storage/v1/object/public/")) return url;
  return (
    url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") +
    `?width=${width}&quality=${quality}&resize=contain`
  );
}
