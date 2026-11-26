import type { Metadata } from "next";
import { WorkCatalog } from "@/components/work/WorkCatalog";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Selected Work & Architectural Case Studies",
  description:
    "Six shipped engineering case studies by Akaolisa Enwedo (OXAKALABS): Koridor Engine OS, Fortress Fleet AI, Institutional Crypto & Wealth Platform, Stitch Retail Operations OS, Quant Forex/Crypto/HFT Suites, and Production E-Commerce Builds.",
  path: "/work",
});

export default function WorkPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <header className="mb-12 border-b border-[var(--border-hairline)] pb-10">
        <h1 className="type-page-title text-[var(--ink-primary)]">
          Selected systems and technical dossiers
        </h1>
        <p className="type-body mt-4 max-w-[62ch] text-[var(--ink-secondary)]">
          Production SaaS platforms, multi-agent governance tooling, FinTech
          ledgers, and algorithmic trading engines. Open any dossier to inspect
          its interactive architecture schematic and operational outcomes.
        </p>
      </header>

      <WorkCatalog />
    </div>
  );
}
