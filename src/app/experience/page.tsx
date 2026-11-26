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
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <ExperienceView />
    </div>
  );
}
