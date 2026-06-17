/** Central site config used across SEO (metadata, sitemap, robots, JSON-LD). */

const PRODUCTION_URL = "https://portfolio.zenkaimedia.in";

function resolveUrl(): string {
  // Explicit override always wins.
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  // Live production deployment → the real custom domain.
  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_URL;
  }
  // Vercel preview deployments → their generated URL.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Local dev.
  return "http://localhost:3000";
}

export const SITE = {
  name: "Zenkai Media",
  shortName: "Zenkai",
  url: resolveUrl(),
  title: "Zenkai Media — Creative Growth Agency",
  description:
    "Zenkai Media is a creative growth agency — branding, AI video, video production, web development and performance marketing. 500+ projects across 20+ industries.",
  tagline: "We make brands grow.",
  locale: "en_US",
  cities: ["Mumbai", "Bangalore", "Delhi", "Ahmedabad"],
  countries: ["India", "USA", "UK", "UAE", "Germany", "Australia", "Canada"],
  services: [
    "Branding",
    "AI Video",
    "Video Production",
    "Web Development",
    "Performance Marketing",
    "UGC",
  ],
  keywords: [
    "creative agency",
    "growth agency",
    "branding agency",
    "AI video",
    "UGC",
    "video production",
    "web development",
    "performance marketing",
    "digital marketing",
    "Zenkai Media",
    "creative agency India",
    "Mumbai",
    "Bangalore",
    "Delhi",
    "Ahmedabad",
  ],
  socials: {
    instagram: "https://www.instagram.com/zenkaimedia.in",
    youtube: "https://www.youtube.com/@zenkaimedia_in",
    threads: "https://www.threads.com/@zenkaimedia.in",
    linkedin: "https://www.linkedin.com/company/zenkaimedia",
  },
} as const;

export const SOCIAL_LINKS = Object.values(SITE.socials);
