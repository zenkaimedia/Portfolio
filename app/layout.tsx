import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio | Zenkai Media",
  description: "Premium portfolio showcasing AI videos, UGC content, and web design",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta charSet="utf-8" />
      </head>
      <body className="bg-white text-black antialiased">
        {children}
      </body>
    </html>
  );
}
