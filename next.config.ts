import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "framer-motion"],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/resume/Akaolisa-Enwedo-Resume.pdf",
          destination: "/api/resume?mode=view&source=direct",
        },
      ],
      afterFiles: [
        {
          source: "/opengraph-image",
          destination: "/og-image.png",
        },
        {
          source: "/icon",
          destination: "/favicon.png",
        },
      ],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/(admin|api/admin)(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, private",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source:
          "/(og-image\\.png|apple-touch-icon\\.png|favicon\\.png|favicon-32x32\\.png|favicon\\.ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
