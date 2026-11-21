import type { Metadata } from "next";
import { ExperienceView } from "@/components/experience/ExperienceView";

export const metadata: Metadata = {
  title: "Experience, Clinical Lab & Credentials",
  description:
    "Career timeline, OXAKALABS studio leadership, Outlier.ai & OneForma RLHF benchmarking, FMC Umuahia clinical leadership (250+ trainees), B.MLS Clinical Chemistry thesis, 2026 hackathons, and languages.",
};

export default function ExperiencePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="mb-10 border-b border-[#E5E2DC] pb-8">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
          Dossier · Engineering × Clinical Science
        </p>
        <h1 className="mt-2.5 text-3xl font-semibold tracking-tight text-[#111214] sm:text-4xl">
          Experience, Clinical Lab &amp; Credentials
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4B4E54]">
          Combining full-lifecycle software engineering at OXAKALABS and
          frontier RLHF evaluation with licensed clinical chemistry training and
          leadership across 250+ medical laboratory trainees.
        </p>
      </header>

      <ExperienceView />
    </div>
  );
}
