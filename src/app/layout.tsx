import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { PortfolioShell } from "@/components/layout/PortfolioShell";
import { PROFILE } from "@/data/profile";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oxakalabs.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  title: {
    default: `${PROFILE.displayName} — Full-Stack, AI Agent & Quantitative Engineer`,
    template: `%s | ${PROFILE.displayName}`,
  },
  description:
    "Personal engineering portfolio of Akaolisa Enwedo (Enwedo Akaolisa Gift) — Founder at OXAKALABS shipping Full-Stack Next.js SaaS, Multi-Agent AI systems, Quant/FinTech tooling, and HealthTech solutions with licensed B.MLS empirical rigor.",
  keywords: [
    "Akaolisa Enwedo",
    "Enwedo Akaolisa Gift",
    "OXAKALABS",
    "Full-Stack Next.js Engineer",
    "AI Agent Engineer",
    "Quantitative FinTech Developer",
    "Biomedical Systems Specialist",
    "Fortress Fleet AI",
    "Koridor Engine OS",
  ],
  authors: [{ name: PROFILE.legalName, url: PROFILE.githubUrl }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: `${PROFILE.displayName} · OXAKALABS`,
    title: `${PROFILE.displayName} — Full-Stack, AI Agent & Quantitative Engineer`,
    description:
      "Founder at OXAKALABS delivering production SaaS, autonomous multi-agent systems, algorithmic trading tooling, and biomedical data solutions.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${PROFILE.displayName} — Full-Stack, AI Agent & Quantitative Engineer`,
    description:
      "Production SaaS, Multi-Agent AI, Quant/FinTech, and Biomedical Systems by Akaolisa Enwedo (OXAKALABS).",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased">
        <PortfolioShell>{children}</PortfolioShell>
        <Analytics />
      </body>
    </html>
  );
}
