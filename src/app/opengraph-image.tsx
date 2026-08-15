import { ImageResponse } from "next/og";

export const alt = "Garden — a digital garden";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0c",
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(132,165,157,0.15) 0%, transparent 45%), radial-gradient(circle at 80% 75%, rgba(132,165,157,0.1) 0%, transparent 45%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: "#84a59d",
            }}
          />
          <span
            style={{
              fontSize: 28,
              color: "#84a59d",
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            a digital garden, growing
          </span>
        </div>
        <div
          style={{
            fontSize: 190,
            fontWeight: 700,
            color: "#f5f3f0",
            marginTop: 24,
            lineHeight: 1,
          }}
        >
          garden
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#909098",
            marginTop: 32,
          }}
        >
          Notes, essays, and ideas grown in Obsidian.
        </div>
      </div>
    ),
    size
  );
}
