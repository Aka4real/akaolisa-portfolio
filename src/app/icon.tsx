import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backgroundColor: "#0F141E",
          color: "#F8F9FB",
          fontSize: "14px",
          fontWeight: 700,
          borderRadius: "7px",
          fontFamily: "sans-serif",
          letterSpacing: "-0.03em",
          borderBottom: "3px solid #1D4ED8",
        }}
      >
        AE
      </div>
    ),
    { ...size }
  );
}
