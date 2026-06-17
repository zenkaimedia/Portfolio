import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Zenkai Media — Creative Growth Agency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#0a0a0b",
          color: "#ece7df",
          backgroundImage:
            "radial-gradient(900px 560px at 8% -5%, rgba(240,180,41,0.20), transparent 60%), radial-gradient(700px 600px at 105% 110%, rgba(255,107,53,0.12), transparent 55%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 24,
            letterSpacing: 8,
            color: "#f0b429",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "#f0b429",
            }}
          />
          Creative Growth Agency
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 110, fontWeight: 800, lineHeight: 1 }}>
            We make brands
          </div>
          <div
            style={{
              fontSize: 110,
              fontWeight: 800,
              lineHeight: 1,
              color: "#f0b429",
            }}
          >
            grow.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 2 }}>
            ZENKAI MEDIA
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#7a766f",
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Branding · AI Video · Web · Marketing
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
