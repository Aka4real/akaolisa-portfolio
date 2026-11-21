import fs from "node:fs";
import path from "node:path";
import React from "react";
import { ImageResponse } from "next/og.js";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");

const geistSansRegular = fs.readFileSync(
  path.join(ROOT, "node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf")
);
const geistSansMedium = fs.readFileSync(
  path.join(ROOT, "node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf")
);
const geistSansSemiBold = fs.readFileSync(
  path.join(ROOT, "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf")
);
const geistSansBold = fs.readFileSync(
  path.join(ROOT, "node_modules/geist/dist/fonts/geist-sans/Geist-Bold.ttf")
);
const geistMonoMedium = fs.readFileSync(
  path.join(ROOT, "node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.ttf")
);
const geistMonoSemiBold = fs.readFileSync(
  path.join(ROOT, "node_modules/geist/dist/fonts/geist-mono/GeistMono-SemiBold.ttf")
);
const geistMonoBold = fs.readFileSync(
  path.join(ROOT, "node_modules/geist/dist/fonts/geist-mono/GeistMono-Bold.ttf")
);

const fonts = [
  {
    name: "Geist Sans",
    data: geistSansRegular,
    weight: 400,
    style: "normal",
  },
  {
    name: "Geist Sans",
    data: geistSansMedium,
    weight: 500,
    style: "normal",
  },
  {
    name: "Geist Sans",
    data: geistSansSemiBold,
    weight: 600,
    style: "normal",
  },
  {
    name: "Geist Sans",
    data: geistSansBold,
    weight: 700,
    style: "normal",
  },
  {
    name: "Geist Mono",
    data: geistMonoMedium,
    weight: 500,
    style: "normal",
  },
  {
    name: "Geist Mono",
    data: geistMonoSemiBold,
    weight: 600,
    style: "normal",
  },
  {
    name: "Geist Mono",
    data: geistMonoBold,
    weight: 700,
    style: "normal",
  },
];

const h = React.createElement;

function buildOgElement() {
  const metrics = [
    { value: "4+ Yrs", label: "OXAKALABS DELIVERY", sub: "Production SaaS & AI" },
    { value: "06", label: "SHIPPED SYSTEMS", sub: "Freight, AI, FinTech, HFT" },
    { value: "250+", label: "CLINICAL TRAINEES", sub: "FMC Umuahia Coordination" },
    { value: "04", label: "CORE VERTICALS", sub: "SaaS · AI · Quant · BioMed" },
  ];

  return h(
    "div",
    {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#F8F9FB",
        color: "#0F141E",
        fontFamily: '"Geist Sans"',
        position: "relative",
        overflow: "hidden",
        padding: "52px 64px 44px 64px",
        border: "1px solid rgba(15, 20, 30, 0.10)",
      },
    },
    // Top cobalt calibration bar
    h("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "6px",
        background: "linear-gradient(90deg, #0F141E 0%, #1D4ED8 55%, #153AA2 100%)",
      },
    }),
    // Subtle radial cobalt accent glow in top-right corner
    h("div", {
      style: {
        position: "absolute",
        top: "-140px",
        right: "-100px",
        width: "560px",
        height: "560px",
        borderRadius: "280px",
        background:
          "radial-gradient(circle, rgba(29, 78, 216, 0.13) 0%, rgba(29, 78, 216, 0.04) 48%, rgba(248, 249, 251, 0) 75%)",
      },
    }),
    // Subtle secondary glow bottom-left
    h("div", {
      style: {
        position: "absolute",
        bottom: "-180px",
        left: "-100px",
        width: "480px",
        height: "480px",
        borderRadius: "240px",
        background:
          "radial-gradient(circle, rgba(21, 58, 162, 0.07) 0%, rgba(248, 249, 251, 0) 70%)",
      },
    }),

    // HEADER ROW: Brand Logo/Mark at top-left + Availability badge at top-right
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(15, 20, 30, 0.10)",
          paddingBottom: "22px",
          width: "100%",
        },
      },
      // Brand Lockup
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "16px",
          },
        },
        h(
          "div",
          {
            style: {
              width: "48px",
              height: "48px",
              backgroundColor: "#0F141E",
              color: "#F8F9FB",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: '"Geist Mono"',
              fontWeight: 700,
              fontSize: "19px",
              letterSpacing: "-0.03em",
              borderRadius: "11px",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(15, 20, 30, 0.12)",
            },
          },
          h("span", { style: { marginBottom: "2px" } }, "AE"),
          h("div", {
            style: {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "4px",
              backgroundColor: "#1D4ED8",
            },
          })
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            },
          },
          h(
            "span",
            {
              style: {
                fontSize: "19px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#0F141E",
              },
            },
            "AKAOLISA ENWEDO"
          ),
          h(
            "span",
            {
              style: {
                fontFamily: '"Geist Mono"',
                fontSize: "12.5px",
                fontWeight: 500,
                color: "#5B6475",
                letterSpacing: "0.05em",
              },
            },
            "FOUNDER, OXAKALABS · LICENSED BIOMEDICAL SCIENTIST (B.MLS)"
          )
        )
      ),
      // Status Badge
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "9px",
            backgroundColor: "#EEF3FF",
            border: "1px solid rgba(29, 78, 216, 0.26)",
            padding: "8px 16px",
            borderRadius: "9999px",
          },
        },
        h("div", {
          style: {
            width: "8px",
            height: "8px",
            borderRadius: "9999px",
            backgroundColor: "#136F3A",
          },
        }),
        h(
          "span",
          {
            style: {
              fontFamily: '"Geist Mono"',
              fontSize: "12.5px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "#153AA2",
            },
          },
          "REMOTE WORLDWIDE · UTC+1"
        )
      )
    ),

    // MAIN EDITORIAL CONTENT: Kicker + Punchy Headline + Concise Subtitle
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          marginTop: "6px",
          marginBottom: "6px",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "10px",
          },
        },
        h(
          "span",
          {
            style: {
              fontFamily: '"Geist Mono"',
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "#1D4ED8",
              textTransform: "uppercase",
            },
          },
          "FULL-STACK NEXT.JS SAAS  ·  MULTI-AGENT AI  ·  QUANT & FINTECH  ·  HEALTHTECH"
        )
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            fontSize: "54px",
            fontWeight: 700,
            lineHeight: 1.07,
            letterSpacing: "-0.035em",
            color: "#0F141E",
          },
        },
        h("span", null, "Engineering SaaS, AI agents &"),
        h(
          "div",
          { style: { display: "flex", alignItems: "baseline", gap: "14px" } },
          h("span", null, "quant systems with"),
          h(
            "span",
            {
              style: {
                color: "#153AA2",
              },
            },
            "clinical rigor."
          )
        )
      ),
      h(
        "div",
        {
          style: {
            fontSize: "21px",
            fontWeight: 400,
            color: "#434C5E",
            lineHeight: 1.42,
            maxWidth: "980px",
          },
        },
        "Shipping multi-tenant web platforms, autonomous LLM agent pipelines, and algorithmic trading infrastructure backed by empirical laboratory discipline."
      )
    ),

    // METRIC LEDGER STRIP + FOOTER
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          width: "100%",
        },
      },
      // 4-Column Swiss Metric Card
      h(
        "div",
        {
          style: {
            display: "flex",
            width: "100%",
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(15, 20, 30, 0.10)",
            borderRadius: "14px",
            padding: "16px 24px",
            boxShadow: "0 4px 16px rgba(15, 20, 30, 0.04)",
          },
        },
        ...metrics.map((m, idx) =>
          h(
            "div",
            {
              key: m.label,
              style: {
                display: "flex",
                flexDirection: "column",
                flex: 1,
                paddingLeft: idx === 0 ? "0px" : "22px",
                borderLeft:
                  idx === 0 ? "none" : "1px solid rgba(15, 20, 30, 0.09)",
              },
            },
            h(
              "span",
              {
                style: {
                  fontFamily: '"Geist Mono"',
                  fontSize: "22px",
                  fontWeight: 700,
                  color: idx === 1 ? "#153AA2" : "#0F141E",
                  letterSpacing: "-0.02em",
                },
              },
              m.value
            ),
            h(
              "span",
              {
                style: {
                  fontFamily: '"Geist Mono"',
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#434C5E",
                  letterSpacing: "0.05em",
                  marginTop: "2px",
                },
              },
              m.label
            )
          )
        )
      ),
      // Bottom URL & Stack Bar
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "14px",
            fontFamily: '"Geist Mono"',
            color: "#5B6475",
          },
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "10px",
            },
          },
          h(
            "span",
            {
              style: {
                color: "#153AA2",
                fontWeight: 600,
              },
            },
            "www.oxakalabs.xyz"
          ),
          h("span", { style: { color: "#94A3B8" } }, "·"),
          h("span", { style: { fontWeight: 500 } }, "github.com/Aka4real")
        ),
        h(
          "span",
          {
            style: {
              color: "#434C5E",
              fontWeight: 600,
              letterSpacing: "0.04em",
            },
          },
          "NEXT.JS  ·  TYPESCRIPT  ·  SUPABASE  ·  GEMINI AI  ·  PYTHON"
        )
      )
    )
  );
}

function buildIconElement(sizePx) {
  const fontSize = Math.round(sizePx * 0.44);
  const borderRadius = Math.round(sizePx * 0.22);
  const bottomBarHeight = Math.max(3, Math.round(sizePx * 0.085));
  const pillWidth = Math.round(sizePx * 0.52);

  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#0F141E",
        color: "#F8F9FB",
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        borderRadius: `${borderRadius}px`,
        fontFamily: '"Geist Mono"',
        letterSpacing: "-0.04em",
      },
    },
    h("span", { style: { marginBottom: `${Math.round(bottomBarHeight * 0.5)}px` } }, "AE"),
    h("div", {
      style: {
        position: "absolute",
        bottom: `${Math.max(2, Math.round(sizePx * 0.08))}px`,
        width: `${pillWidth}px`,
        height: `${bottomBarHeight}px`,
        borderRadius: "9999px",
        backgroundColor: "#1D4ED8",
      },
    })
  );
}

/**
 * Wrap a 32x32 PNG buffer inside a valid Windows ICO container.
 * Modern browsers and link preview crawlers support PNG-compressed ICO frames.
 */
function createIcoFromPng(pngBuffer, width = 32, height = 32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(1, 4); // Image count: 1

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(width === 256 ? 0 : width, 0);
  dirEntry.writeUInt8(height === 256 ? 0 : height, 1);
  dirEntry.writeUInt8(0, 2); // Color palette
  dirEntry.writeUInt8(0, 3); // Reserved
  dirEntry.writeUInt16LE(1, 4); // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  dirEntry.writeUInt32LE(6 + 16, 12); // Offset of image data

  return Buffer.concat([header, dirEntry, pngBuffer]);
}

async function main() {
  // 1. Generate 1200x630 OG Image
  const ogRes = new ImageResponse(buildOgElement(), {
    width: 1200,
    height: 630,
    fonts,
  });
  const ogBuf = Buffer.from(await ogRes.arrayBuffer());
  const ogPath = path.join(PUBLIC_DIR, "og-image.png");
  fs.writeFileSync(ogPath, ogBuf);
  console.log(`Generated ${ogPath} (${ogBuf.length} bytes)`);

  // 2. Generate 180x180 Apple Touch Icon
  const appleRes = new ImageResponse(buildIconElement(180), {
    width: 180,
    height: 180,
    fonts,
  });
  const appleBuf = Buffer.from(await appleRes.arrayBuffer());
  const applePath = path.join(PUBLIC_DIR, "apple-touch-icon.png");
  fs.writeFileSync(applePath, appleBuf);
  console.log(`Generated ${applePath} (${appleBuf.length} bytes)`);

  // 3. Generate 64x64 favicon.png
  const fav64Res = new ImageResponse(buildIconElement(64), {
    width: 64,
    height: 64,
    fonts,
  });
  const fav64Buf = Buffer.from(await fav64Res.arrayBuffer());
  const favPngPath = path.join(PUBLIC_DIR, "favicon.png");
  fs.writeFileSync(favPngPath, fav64Buf);
  console.log(`Generated ${favPngPath} (${fav64Buf.length} bytes)`);

  // 4. Generate 32x32 favicon-32x32.png + favicon.ico
  const fav32Res = new ImageResponse(buildIconElement(32), {
    width: 32,
    height: 32,
    fonts,
  });
  const fav32Buf = Buffer.from(await fav32Res.arrayBuffer());
  const fav32Path = path.join(PUBLIC_DIR, "favicon-32x32.png");
  fs.writeFileSync(fav32Path, fav32Buf);
  console.log(`Generated ${fav32Path} (${fav32Buf.length} bytes)`);

  const icoBuf = createIcoFromPng(fav32Buf, 32, 32);
  const icoPath = path.join(PUBLIC_DIR, "favicon.ico");
  fs.writeFileSync(icoPath, icoBuf);
  console.log(`Generated ${icoPath} (${icoBuf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
