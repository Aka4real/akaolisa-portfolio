"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, DownloadSimple } from "@phosphor-icons/react";
import {
  EDUCATION,
  EXPERIENCE_ITEMS,
  HACKATHONS_AND_PROGRAMS,
  LANGUAGES,
  type ExperienceCategory,
} from "@/data/experience";
import { PROFILE } from "@/data/profile";
import { usePortfolioActions } from "@/components/layout/PortfolioShell";
import {
  BlurCrossfade,
  ClipSegmentedTabs,
  StaggerGroup,
  StaggerItem,
  type SegmentedTabOption,
} from "@/components/ui/MotionPrimitives";

type ExpFilter = "all" | ExperienceCategory;

const EXPERIENCE_TABS: ReadonlyArray<SegmentedTabOption<ExpFilter>> = [
  { value: "all", label: "All roles" },
  { value: "software-ai", label: "Software and AI" },
  { value: "clinical-biomedical", label: "Clinical and lab" },
];

export function ExperienceView() {
  const [activeTab, setActiveTab] = useState<ExpFilter>("all");
  const { openResume } = usePortfolioActions();

  const visibleItems = useMemo(
    () =>
      EXPERIENCE_ITEMS.filter((item) =>
        activeTab === "all" ? true : item.category === activeTab
      ),
    [activeTab]
  );

  return (
    <div className="space-y-16">
      {/* Direct Typographic CV Sheet Header */}
      <header className="flex flex-col justify-between gap-8 border-b border-[var(--border-hairline)] pb-10 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <h1 className="type-page-title text-[var(--ink-primary)]">
            Experience, clinical lab, and credentials
          </h1>
          <p className="type-body mt-4 max-w-[60ch] text-[var(--ink-secondary)]">
            Full-lifecycle software engineering at OXAKALABS and frontier RLHF
            evaluation paired with licensed clinical chemistry training and
            leadership across 250+ medical laboratory trainees.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={openResume}
            className="type-sm font-medium text-[var(--accent-deep)] underline decoration-[var(--accent-border)] transition-colors duration-150 hover:text-[var(--accent)] hover:decoration-[var(--accent)]"
          >
            Preview PDF
          </button>

          <a
            href={PROFILE.resumePdfPath}
            download={PROFILE.resumeFileName}
            className="btn-press type-sm inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-5 py-3 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)]"
          >
            <DownloadSimple size={15} weight="bold" aria-hidden="true" />
            <span>Download resume PDF</span>
          </a>
        </div>
      </header>

      {/* Chronological Ledger */}
      <section aria-labelledby="trajectory-heading">
        <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h2
              id="trajectory-heading"
              className="type-heading text-[var(--ink-primary)]"
            >
              Engineering, AI training, and clinical leadership
            </h2>
            <p className="type-body mt-2 max-w-[56ch] text-[var(--ink-secondary)]">
              Filter by software engineering and AI work or licensed clinical
              laboratory leadership across teaching hospitals.
            </p>
          </div>

          <ClipSegmentedTabs
            options={EXPERIENCE_TABS}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel="Filter experience by discipline"
            variant="inverse"
            size="md"
          />
        </div>

        <BlurCrossfade contentKey={activeTab}>
          <StaggerGroup
            key={activeTab}
            trigger="mount"
            staggerStep={0.035}
            maxDelay={0.14}
            y={8}
            className="divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]"
          >
            {visibleItems.map((item, idx) => (
              <StaggerItem key={item.id} index={idx}>
                <article className="grid gap-5 py-9 lg:grid-cols-12 lg:gap-10">
                  <div className="lg:col-span-3">
                    <p className="type-meta font-medium text-[var(--ink-primary)]">
                      {item.period}
                    </p>
                    <p className="type-sm mt-1 text-[var(--ink-muted)]">
                      {item.location}
                    </p>
                    <p className="type-kicker mt-2.5 text-[var(--accent-deep)]">
                      {item.category === "software-ai"
                        ? "Software and AI"
                        : "Clinical and biomedical"}
                    </p>
                  </div>

                  <div className="min-w-0 lg:col-span-9">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="type-subhead text-[var(--ink-primary)]">
                        {item.organization}
                      </h3>
                      {item.highlightBadge && (
                        <span className="type-meta text-[var(--ink-muted)]">
                          · {item.highlightBadge}
                        </span>
                      )}
                    </div>

                    <p className="type-body mt-1 font-medium text-[var(--ink-secondary)]">
                      {item.role}
                    </p>

                    <ul className="mt-4 space-y-3">
                      {item.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="type-body flex max-w-[65ch] items-start gap-3 text-[var(--ink-secondary)]"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    {item.links && item.links.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-5 pt-1">
                        {item.links.map((ext) => (
                          <a
                            key={ext.href}
                            href={ext.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="type-sm group inline-flex items-center gap-1 font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
                          >
                            <span>{ext.label}</span>
                            <ArrowUpRight
                              size={14}
                              weight="bold"
                              className="hover-nudge-ne shrink-0"
                              aria-hidden="true"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </BlurCrossfade>
      </section>

      {/* Education & Languages Split */}
      <section className="grid gap-12 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <h2 className="type-heading text-[var(--ink-primary)]">
            Education and clinical research
          </h2>

          <h3 className="type-subhead mt-6 text-[var(--ink-primary)]">
            {EDUCATION.degree}
          </h3>
          <p className="type-meta mt-1 text-[var(--ink-muted)]">
            {EDUCATION.specialization} · {EDUCATION.institution}
          </p>

          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div className="border-t border-[var(--border-hairline)] pt-4">
              <p className="type-kicker tabular-nums text-[var(--accent-deep)]">
                Research thesis · {EDUCATION.thesisYear}
              </p>
              <p className="type-body mt-2 text-[var(--ink-primary)]">
                {EDUCATION.thesisTitle}
              </p>
            </div>

            <div className="border-t border-[var(--border-hairline)] pt-4">
              <p className="type-kicker tabular-nums text-[var(--accent-deep)]">
                Clinical seminar · {EDUCATION.seminarYear}
              </p>
              <p className="type-body mt-2 text-[var(--ink-primary)]">
                {EDUCATION.seminarTitle}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-5 lg:border-l lg:border-[var(--border-hairline)] lg:pl-10">
          <h2 className="type-heading text-[var(--ink-primary)]">
            Languages
          </h2>

          <ul className="mt-6 divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]">
            {LANGUAGES.map((lang) => (
              <li key={lang.name} className="py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="type-subhead text-[var(--ink-primary)]">
                    {lang.name}
                  </span>
                  <span className="type-meta text-[var(--ink-muted)]">
                    {lang.proficiency}
                  </span>
                </div>
                {lang.notes && (
                  <p className="type-sm mt-1 text-[var(--ink-secondary)]">
                    {lang.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2026 Hackathons & Builder Cohorts */}
      <section
        aria-labelledby="cohorts-heading"
        className="rounded-[var(--radius-md)] bg-[var(--bg-subtle)] px-6 py-10 sm:px-10 sm:py-12"
      >
        <h2
          id="cohorts-heading"
          className="type-heading text-[var(--ink-primary)]"
        >
          Selected 2026 hackathons and builder cohorts
        </h2>

        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {HACKATHONS_AND_PROGRAMS.map((item) => (
            <div
              key={item.name}
              className="border-t border-[var(--border-hairline)] pt-4"
            >
              <p className="type-meta font-medium text-[var(--accent-deep)]">
                {item.organizer} · {item.year}
              </p>
              <h3 className="type-subhead mt-2 text-[var(--ink-primary)]">
                {item.name}
              </h3>
              <p className="type-body mt-2 text-[var(--ink-secondary)]">
                {item.focus}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
