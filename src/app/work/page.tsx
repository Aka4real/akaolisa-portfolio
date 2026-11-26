import type { Metadata } from "next";
import { WorkCatalog } from "@/components/work/WorkCatalog";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Selected Work & Architectural Case Studies",
  description:
    "Seven shipped engineering case studies by Akaolisa Enwedo (OXAKALABS): G-Gravitator, Koridor Engine OS, Fortress Fleet AI, Institutional Crypto & Wealth Platform, Stitch Retail Operations OS, Quant Forex/Crypto/HFT Suites, and Production E-Commerce Builds.",
  path: "/work",
});

export default function WorkPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="mb-10 border-b border-[var(--border-hairline)] pb-8">
        <h1 className="text-[clamp(2rem,3.2vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.03em] text-[var(--ink-primary)]">
          Selected Systems &amp; Technical Dossiers
        </h1>
        <p className="mt-4 max-w-[62ch] text-[16.5px] leading-[1.62] text-[var(--ink-secondary)]">
          Production SaaS platforms, DevOps &amp; cloud infrastructure
          deployments, multi-agent governance tooling, FinTech ledgers, and
          algorithmic trading engines. Open any dossier to inspect its
          interactive architecture schematic and operational outcomes.
        </p>
      </header>

      <WorkCatalog />
    </div>
  );
}
