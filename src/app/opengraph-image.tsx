import { ImageResponse } from "next/og";

export const alt =
  "Akaolisa Enwedo - Full-Stack, AI Agent & Quantitative Engineer";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F8F9FB",
          color: "#0F141E",
          padding: "64px 72px",
          border: "1px solid rgba(15, 20, 30, 0.08)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid rgba(15, 20, 30, 0.08)",
            paddingBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                backgroundColor: "#0F141E",
                color: "#F8F9FB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "18px",
                borderRadius: "10px",
              }}
            >
              AE
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "#0F141E",
                }}
              >
                AKAOLISA ENWEDO
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: "#5B6475",
                  letterSpacing: "0.05em",
                }}
              >
                FOUNDER, OXAKALABS · B.MLS CLINICAL CHEMISTRY
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              border: "1px solid rgba(29, 78, 216, 0.24)",
              backgroundColor: "#EEF3FF",
              color: "#153AA2",
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            REMOTE WORLDWIDE · UTC+1
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              fontSize: "56px",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#0F141E",
            }}
          >
            Full-Stack SaaS, AI Agents &amp; Quantitative Systems.
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#434C5E",
              lineHeight: 1.4,
            }}
          >
            Built with clinical laboratory rigor: shipping production Next.js
            platforms, multi-agent governance, and algorithmic trading
            infrastructure.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "2px solid rgba(15, 20, 30, 0.08)",
            paddingTop: "24px",
            fontSize: "16px",
            color: "#434C5E",
          }}
        >
          <span>oxakalabs.xyz · github.com/Aka4real</span>
          <span style={{ color: "#1D4ED8", fontWeight: 600 }}>
            06 SHIPPED SYSTEMS · 250+ CLINICAL TRAINEES
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
