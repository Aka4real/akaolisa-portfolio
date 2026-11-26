import { Suspense } from "react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact & Project Inquiry",
  description:
    "Start a Full-Stack SaaS, Multi-Agent AI, Quantitative FinTech, or HealthTech project with Akaolisa Enwedo (OXAKALABS). Available remotely worldwide from UTC+1.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <header className="mb-12 border-b border-[var(--border-hairline)] pb-10">
        <h1 className="type-page-title text-[var(--ink-primary)]">
          Start a project or technical conversation
        </h1>
        <p className="type-body mt-4 max-w-[60ch] text-[var(--ink-secondary)]">
          Available remotely worldwide from UTC+1 for full-stack SaaS builds,
          multi-agent AI pipelines, algorithmic trading tooling, technical
          leadership roles, and research collaborations.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="type-sm py-8 text-[var(--ink-muted)]">
            Loading inquiry workbench...
          </div>
        }
      >
        <ContactForm />
      </Suspense>
    </div>
  );
}
