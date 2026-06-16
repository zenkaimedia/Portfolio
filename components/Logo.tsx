/**
 * Zenkai Media logo.
 *  - variant="full"  → full wordmark (public/logo2.png) — used in headers/home
 *  - variant="mark"  → swirl symbol only (public/logo1.png) — compact spaces
 *
 * The source art is solid BLACK on transparent, so we invert it to white to
 * sit on the dark cinematic canvas. Size it with a height utility, e.g.
 * <Logo className="h-7 md:h-9" />.
 */
export default function Logo({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "mark";
  className?: string;
}) {
  const src = variant === "mark" ? "/logo1.png" : "/logo2.png";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Zenkai Media"
      draggable={false}
      className={`w-auto select-none ${className}`}
      style={{ filter: "invert(1)" }}
    />
  );
}
