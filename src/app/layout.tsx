import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist_Mono, Host_Grotesk, Onest } from "next/font/google";
import "./globals.css";
import { PortfolioShell } from "@/components/layout/PortfolioShell";
import { PROFILE } from "@/data/profile";
import {
  OG_IMAGE_ALT,
  OG_IMAGE_URL,
  SITE_URL,
  getRootUrlWithTrailingSlash,
} from "@/lib/site";

const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-host-grotesk",
  display: "swap",
});

const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const defaultTitle = `${PROFILE.displayName} - Full-Stack, DevOps, AI Agent & Quantitative Engineer`;
const ogDescription =
  "Founder at OXAKALABS delivering production SaaS, resilient DevOps & cloud infrastructure, autonomous multi-agent systems, algorithmic trading tooling, and biomedical data solutions.";
const rootCanonicalUrl = getRootUrlWithTrailingSlash();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: rootCanonicalUrl,
  },
  title: {
    default: defaultTitle,
    template: `%s | ${PROFILE.displayName}`,
  },
  description:
    "Personal engineering portfolio of Akaolisa Enwedo (Enwedo Akaolisa Gift), Founder at OXAKALABS shipping Full-Stack Next.js SaaS, DevOps & Cloud Infrastructure (Docker, Coolify, Linux VPS, Cloud Run, CI/CD), Multi-Agent AI systems, Quant/FinTech tooling, and HealthTech solutions with licensed B.MLS empirical rigor.",
  keywords: [
    "Akaolisa Enwedo",
    "Enwedo Akaolisa Gift",
    "OXAKALABS",
    "G-Gravitator",
    "DevOps Engineer",
    "Cloud Infrastructure Engineer",
    "Docker & Linux VPS",
    "CI/CD & Google Cloud Run",
    "Full-Stack Next.js Engineer",
    "AI Agent Engineer",
    "Quantitative FinTech Developer",
    "Biomedical Systems Specialist",
    "Fortress Fleet AI",
    "Koridor Engine OS",
  ],
  authors: [{ name: PROFILE.legalName, url: PROFILE.githubUrl }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: rootCanonicalUrl,
    siteName: `${PROFILE.displayName} · OXAKALABS`,
    title: defaultTitle,
    description: ogDescription,
    images: [
      {
        url: OG_IMAGE_URL,
        secureUrl: OG_IMAGE_URL,
        type: "image/png",
        width: 1200,
        height: 630,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description:
      "Production SaaS, DevOps & Cloud Infrastructure, Multi-Agent AI, Quant/FinTech, and Biomedical Systems by Akaolisa Enwedo (OXAKALABS).",
    images: [OG_IMAGE_URL],
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
      className={`${hostGrotesk.variable} ${onest.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">
        <PortfolioShell>{children}</PortfolioShell>
        <Analytics />
      </body>
    </html>
  );
}
