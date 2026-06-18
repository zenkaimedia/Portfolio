import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      {/* Decorative swirl watermark (desktop only) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[18vw] top-1/2 -z-10 hidden -translate-y-1/2 select-none opacity-[0.05] md:block"
      >
        <Logo variant="mark" className="h-[88vh]" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6 md:px-12 md:py-6">
        <Logo className="h-6 sm:h-7 md:h-9" />
        <div className="flex items-center gap-5 sm:gap-8">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-bone/70 sm:inline sm:text-[11px] sm:tracking-[0.25em]">
            est. 2024
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-10 sm:px-6 md:px-12 md:py-12">
        <Services />

        <h1
          className="font-display font-extrabold leading-[0.95] tracking-tight text-bone md:leading-[0.9]"
          style={{
            fontSize: "clamp(2.25rem, 9vw, 5.75rem)",
            animation: "rise 0.8s ease 0.05s both",
          }}
        >
          We&apos;re the
          <br />
          humans behind
          <br />
          the{" "}
          <span
            className="relative inline-block text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(100deg, var(--color-gold-soft), var(--color-gold) 40%, var(--color-ember))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            growth.
          </span>
        </h1>

        <p
          className="mt-7 max-w-2xl text-[15px] font-light leading-relaxed text-muted sm:text-base md:mt-10 md:text-lg"
          style={{ animation: "rise 0.9s ease 0.15s both" }}
        >
          Zenkai Media is a creative growth agency specializing in branding,
          AI video, performance creative, video production, web development, and
          digital marketing. Having delivered 500+ projects across 20+
          industries, we serve clients across India and around the world.
        </p>

        <div
          className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4 md:mt-12"
          style={{ animation: "rise 1s ease 0.25s both" }}
        >
          <a
            href="https://wa.me/919016792014"
            target="_blank"
            rel="noreferrer noopener"
            className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full border border-gold/40 bg-gold/10 px-6 py-4 font-mono text-xs uppercase tracking-[0.22em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 sm:py-3.5 md:px-7 md:tracking-[0.25em]"
          >
            {/* WhatsApp icon */}
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span className="relative z-10">Chat on WhatsApp</span>
            <span className="relative z-10 transition-transform group-hover:translate-x-1">
              →
            </span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <div className="shrink-0">
        <div className="hairline h-px w-full" />
        <div className="flex items-center justify-between gap-4 px-5 py-4 font-mono text-[9px] uppercase tracking-[0.2em] text-muted sm:px-6 sm:text-[10px] sm:tracking-[0.25em] md:px-12 md:py-5 md:tracking-[0.3em]">
          <span>© 2024 Zenkai</span>
          <Socials />
        </div>
      </div>
    </main>
  );
}

const SERVICES = [
  "Branding",
  "AI Video",
  "Video Production",
  "Web",
  "Performance Marketing",
];

function ServiceRow({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden || undefined}>
      {SERVICES.map((service) => (
        <span key={service} className="flex shrink-0 items-center whitespace-nowrap">
          {service}
          <span className="mx-2.5 text-gold/40">·</span>
        </span>
      ))}
    </div>
  );
}

function Services() {
  return (
    <div
      className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold sm:text-[11px] sm:tracking-[0.3em] md:mb-6 md:tracking-[0.35em]"
      style={{ animation: "rise 0.7s ease both" }}
    >
      <div className="overflow-hidden sm:hidden">
        <div className="flex w-max" style={{ animation: "marquee 16s linear infinite" }}>
          <ServiceRow />
          <ServiceRow ariaHidden />
        </div>
      </div>
      <div className="hidden flex-wrap gap-x-2.5 gap-y-1.5 sm:flex">
        {SERVICES.map((service, i) => (
          <span key={service} className="inline-flex items-center whitespace-nowrap">
            {i > 0 && <span className="mr-2.5 text-gold/40" aria-hidden>·</span>}
            {service}
          </span>
        ))}
      </div>
    </div>
  );
}

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/zenkaimedia.in", d: "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" },
  { label: "YouTube", href: "https://www.youtube.com/@zenkaimedia_in", d: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/zenkaimedia", d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
];

function Socials() {
  return (
    <div className="flex items-center gap-4 text-muted sm:gap-5">
      {SOCIALS.map((s) => (
        <a key={s.label} href={s.href} target="_blank" rel="noreferrer noopener" aria-label={s.label} className="transition-colors hover:text-gold">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
            <path d={s.d} />
          </svg>
        </a>
      ))}
    </div>
  );
}
