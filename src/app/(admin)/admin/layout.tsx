import type { Metadata } from "next";

// Keep the entire admin area out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Admin",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
