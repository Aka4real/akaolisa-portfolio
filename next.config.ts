import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "framer-motion"],
  },
  async rewrites() {
    return [
      {
        source: "/opengraph-image",
        destination: "/og-image.png",
      },
      {
        source: "/icon",
        destination: "/favicon.png",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(og-image\\.png|apple-touch-icon\\.png|favicon\\.png|favicon-32x32\\.png|favicon\\.ico)",
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
