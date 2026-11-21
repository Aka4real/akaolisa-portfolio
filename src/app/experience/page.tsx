import type { Metadata } from "next";
import { ExperienceView } from "@/components/experience/ExperienceView";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Experience, Clinical Lab & Credentials",
  description:
    "Career timeline, OXAKALABS studio leadership, Outlier.ai & OneForma RLHF benchmarking, FMC Umuahia clinical leadership (250+ trainees), B.MLS Clinical Chemistry thesis, 2026 hackathons, and languages.",
  path: "/experience",
});

export default function ExperiencePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <ExperienceView />
    </div>
  );
}
