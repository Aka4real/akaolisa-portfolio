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
      <header className="mb-10 border-b border-[var(--border-hairline)] pb-8">
        <h1 className="text-[clamp(2rem,3.2vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--ink-primary)]">
          Start a Project or Technical Conversation
        </h1>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-[1.6] text-[var(--ink-secondary)]">
          Available remotely worldwide from UTC+1 for full-stack SaaS builds,
          multi-agent AI pipelines, algorithmic trading tooling, technical
          leadership roles, and research collaborations.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="surface-elevated rounded-[var(--radius-lg)] p-8 font-mono text-xs text-[var(--ink-muted)]">
            Loading inquiry workbench...
          </div>
        }
      >
        <ContactForm />
      </Suspense>
    </div>
  );
}
