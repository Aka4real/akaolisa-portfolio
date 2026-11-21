import type { Metadata } from "next";
import { WorkCatalog } from "@/components/work/WorkCatalog";

export const metadata: Metadata = {
  title: "Selected Work & Architectural Case Studies",
  description:
    "Six shipped engineering case studies by Akaolisa Enwedo (OXAKALABS): Koridor Engine OS, Fortress Fleet AI, Institutional Crypto & Wealth Platform, Stitch Retail Operations OS, Quant Forex/Crypto/HFT Suites, and Production E-Commerce Builds.",
};

export default function WorkPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="mb-10 border-b border-[#E5E2DC] pb-8">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
          OXAKALABS · Shipped Portfolio (2022 — Present)
        </p>
        <h1 className="mt-2.5 text-3xl font-semibold tracking-tight text-[#111214] sm:text-4xl">
          Selected Systems &amp; Technical Dossiers
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4B4E54]">
          Production SaaS platforms, multi-agent governance tooling, FinTech
          ledgers, and algorithmic trading engines. Open any dossier to inspect
          its interactive architecture schematic, execution trade-offs, and
          business outcomes.
        </p>
      </header>

      <WorkCatalog />
    </div>
  );
}
