import { Suspense } from "react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact & Project Inquiry",
  description:
    "Start a Full-Stack SaaS, Multi-Agent AI, Quantitative FinTech, or HealthTech project with Akaolisa Enwedo (OXAKALABS). Available remotely worldwide from UTC+1.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="mb-10 border-b border-[#E5E2DC] pb-8">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
          Direct Dispatch · Remote Worldwide (UTC+1)
        </p>
        <h1 className="mt-2.5 text-3xl font-semibold tracking-tight text-[#111214] sm:text-4xl">
          Start a Project or Engineering Conversation
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4B4E54]">
          Available for freelance SaaS builds, autonomous AI agent pipelines,
          algorithmic trading tooling, technical leadership roles, and
          hackathon or research collaborations.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="rounded-lg border border-[#E5E2DC] bg-white p-8 font-mono text-xs text-[#6E727A]">
            Loading inquiry specification...
          </div>
        }
      >
        <ContactForm />
      </Suspense>
    </div>
  );
}
