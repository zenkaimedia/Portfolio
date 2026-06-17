import { cookies } from "next/headers";
import crypto from "crypto";

export const ADMIN_COOKIE = "zk_admin";

/** A non-reversible token derived from the admin password (so the raw
 *  password is never stored in the cookie). */
export function adminToken(): string {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  return crypto.createHash("sha256").update(`${pw}::zenkai-admin`).digest("hex");
}

/** True when the request carries a valid admin session cookie. */
export async function isAuthed(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return !!token && token === adminToken();
}
