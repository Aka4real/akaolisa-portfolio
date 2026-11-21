import { ImageResponse } from "next/og";

export const alt = "Akaolisa Enwedo — Full-Stack, AI Agent & Quantitative Engineer";
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
          backgroundColor: "#FAF9F6",
          color: "#111214",
          padding: "64px 72px",
          border: "1px solid #E5E2DC",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid #E5E2DC",
            paddingBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                backgroundColor: "#111214",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "18px",
                borderRadius: "6px",
              }}
            >
              AE
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "0.08em" }}>
                AKAOLISA ENWEDO
              </span>
              <span style={{ fontSize: "14px", color: "#6E727A", letterSpacing: "0.06em" }}>
                FOUNDER, OXAKALABS · B.MLS CLINICAL CHEMISTRY
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              border: "1px solid #BFDBFE",
              backgroundColor: "#EFF4FF",
              color: "#0F3D91",
              padding: "8px 16px",
              borderRadius: "6px",
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
              fontSize: "58px",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#111214",
            }}
          >
            Full-Stack SaaS, AI Agents &amp; Quantitative Systems.
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#4B4E54",
              lineHeight: 1.4,
            }}
          >
            Built with clinical laboratory rigor — shipping production Next.js platforms,
            multi-agent governance, and algorithmic trading infrastructure.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "2px solid #E5E2DC",
            paddingTop: "24px",
            fontSize: "16px",
            color: "#4B4E54",
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
