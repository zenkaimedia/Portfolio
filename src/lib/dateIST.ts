/**
 * Supabase stores timestamps as "timestamp without time zone" and returns
 * strings like "2025-06-24T10:26:00" (no Z / offset). JavaScript's Date
 * constructor treats such strings as LOCAL time, not UTC — causing incorrect
 * display in any timezone offset from UTC.
 *
 * This helper appends "Z" so the string is treated as UTC before converting
 * to the correct locale/timezone.
 */
function toUTC(dateStr: string): Date {
  const utc = /[Z+]/.test(dateStr) ? dateStr : dateStr + "Z";
  return new Date(utc);
}

/** Format a Supabase timestamp as Indian Standard Time (IST / Asia/Kolkata). */
export function fmtIST(dateStr: string): string {
  return toUTC(dateStr).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format as IST date only (no time). */
export function fmtDateIST(dateStr: string): string {
  return toUTC(dateStr).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Returns true if the Supabase timestamp is in the past (IST-aware). */
export function isOverdueIST(dateStr: string): boolean {
  return toUTC(dateStr) < new Date();
}
