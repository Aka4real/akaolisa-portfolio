"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Code,
  DownloadSimple,
  FilePdf,
  Flask,
  GraduationCap,
  Translate,
  Trophy,
} from "@phosphor-icons/react";
import {
  EDUCATION,
  EXPERIENCE_ITEMS,
  HACKATHONS_AND_PROGRAMS,
  LANGUAGES,
  type ExperienceCategory,
} from "@/data/experience";
import { PROFILE } from "@/data/profile";
import { buildTrackedResumeUrl } from "@/lib/telemetry/client";
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
  { value: "all", label: "All Roles" },
  { value: "software-ai", label: "Software, DevOps & AI" },
  { value: "clinical-biomedical", label: "Clinical & Lab" },
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
      {/* Page Header with Inline Resume Actions (zero standalone CV banner box) */}
      <header className="flex flex-col justify-between gap-6 border-b border-[var(--border-hairline)] pb-9 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <h1 className="text-[clamp(2rem,3.2vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.03em] text-[var(--ink-primary)]">
            Experience, Clinical Lab &amp; Credentials
          </h1>
          <p className="mt-4 max-w-[60ch] text-[16.5px] leading-[1.62] text-[var(--ink-secondary)]">
            Full-lifecycle software engineering, DevOps &amp; cloud
            infrastructure at OXAKALABS, and frontier RLHF evaluation paired
            with licensed clinical chemistry training and leadership across 250+
            medical laboratory trainees.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openResume}
            className="btn-press inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-deep)]"
          >
            <FilePdf
              size={15}
              weight="bold"
              className="text-[var(--ink-secondary)]"
              aria-hidden="true"
            />
            <span>Preview PDF</span>
          </button>

          <a
            href="/api/resume?mode=download&source=experience"
            onClick={(e) => {
              e.currentTarget.href = buildTrackedResumeUrl(
                "download",
                "experience"
              );
            }}
            download={PROFILE.resumeFileName}
            className="btn-press inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-4 py-2.5 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)]"
          >
            <DownloadSimple size={15} weight="bold" aria-hidden="true" />
            <span>Download Resume</span>
          </a>
        </div>
      </header>

      {/* Open Swiss Editorial Timeline */}
      <section aria-labelledby="trajectory-heading">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h2
              id="trajectory-heading"
              className="text-[clamp(1.375rem,2vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.025em] text-[var(--ink-primary)]"
            >
              Engineering, DevOps, AI &amp; Clinical Leadership
            </h2>
            <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-[var(--ink-secondary)]">
              Filter by software, DevOps, and AI engineering work or licensed
              clinical laboratory leadership across teaching hospitals and
              public health programs.
            </p>
          </div>

          <div className="max-w-full shrink-0">
            <ClipSegmentedTabs
              options={EXPERIENCE_TABS}
              value={activeTab}
              onChange={setActiveTab}
              ariaLabel="Filter experience by discipline"
              variant="inverse"
              size="md"
              className="max-w-full"
            />
          </div>
        </div>

        <BlurCrossfade contentKey={activeTab}>
          <StaggerGroup
            key={activeTab}
            trigger="mount"
            staggerStep={0.035}
            maxDelay={0.14}
            y={6}
            className="divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]"
          >
            {visibleItems.map((item, idx) => (
              <StaggerItem key={item.id} index={idx}>
                <article className="grid gap-5 py-8 lg:grid-cols-12 lg:gap-10">
                  {/* Left 3 Columns: Tabular Period, Location & Discipline Tag */}
                  <div className="lg:col-span-3">
                    <div className="font-mono text-sm font-semibold tabular-nums text-[var(--ink-primary)]">
                      {item.period}
                    </div>
                    <div className="mt-1 text-xs text-[var(--ink-muted)]">
                      {item.location}
                    </div>
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-secondary)]">
                        {item.category === "software-ai" ? (
                          <Code
                            size={12}
                            weight="bold"
                            className="text-[var(--accent)]"
                            aria-hidden="true"
                          />
                        ) : (
                          <Flask
                            size={12}
                            weight="bold"
                            className="text-[var(--accent)]"
                            aria-hidden="true"
                          />
                        )}
                        <span>
                          {item.category === "software-ai"
                            ? "Software, DevOps & AI"
                            : "Clinical & Biomedical"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Right 9 Columns: Open Typographic Role, Highlights & Links */}
                  <div className="min-w-0 lg:col-span-9">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <h3 className="text-lg font-semibold leading-snug tracking-[-0.015em] text-[var(--ink-primary)] sm:text-xl">
                        {item.organization}
                      </h3>
                      {item.highlightBadge && (
                        <span className="rounded-[var(--radius-xs)] bg-[var(--accent-soft)] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[var(--accent-deep)]">
                          {item.highlightBadge}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-[15px] font-medium text-[var(--ink-secondary)]">
                      {item.role}
                    </p>

                    <ul className="mt-4 space-y-2.5">
                      {item.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex max-w-[65ch] items-start gap-3 text-[15px] leading-[1.65] text-[var(--ink-secondary)]"
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
                      <div className="mt-4 flex flex-wrap gap-4 pt-1">
                        {item.links.map((ext) => (
                          <a
                            key={ext.href}
                            href={ext.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1 font-mono text-xs font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
                          >
                            <span>{ext.label}</span>
                            <ArrowUpRight
                              size={13}
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

      {/* Open Hairline-Separated Education & Languages Band */}
      <section className="grid gap-12 lg:grid-cols-12">
        {/* Education & Clinical Research */}
        <div className="min-w-0 lg:col-span-7">
          <div className="flex items-center gap-2.5">
            <GraduationCap
              size={20}
              weight="bold"
              className="shrink-0 text-[var(--accent)]"
              aria-hidden="true"
            />
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
              Education &amp; Clinical Research
            </h2>
          </div>

          <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em] text-[var(--ink-primary)]">
            {EDUCATION.degree}
          </h3>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {EDUCATION.specialization} · {EDUCATION.institution}
          </p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="border-t border-[var(--border-hairline)] pt-4">
              <div className="font-mono text-[11px] font-semibold tabular-nums text-[var(--accent-deep)]">
                Research Thesis · {EDUCATION.thesisYear}
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--ink-primary)]">
                {EDUCATION.thesisTitle}
              </p>
            </div>

            <div className="border-t border-[var(--border-hairline)] pt-4">
              <div className="font-mono text-[11px] font-semibold tabular-nums text-[var(--accent-deep)]">
                Clinical Seminar · {EDUCATION.seminarYear}
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--ink-primary)]">
                {EDUCATION.seminarTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Languages & Communication */}
        <div className="min-w-0 lg:col-span-5 lg:border-l lg:border-[var(--border-hairline)] lg:pl-10">
          <div className="flex items-center gap-2.5">
            <Translate
              size={20}
              weight="bold"
              className="shrink-0 text-[var(--accent)]"
              aria-hidden="true"
            />
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
              Languages &amp; Communication
            </h2>
          </div>

          <ul className="mt-5 divide-y divide-[var(--border-hairline)] border-t border-[var(--border-hairline)]">
            {LANGUAGES.map((lang) => (
              <li key={lang.name} className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-semibold text-[var(--ink-primary)]">
                    {lang.name}
                  </span>
                  <span className="rounded-[var(--radius-xs)] bg-[var(--bg-subtle)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--ink-secondary)]">
                    {lang.proficiency}
                  </span>
                </div>
                {lang.notes && (
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-muted)]">
                    {lang.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Open Subtle Architectural Band: 2026 Hackathons & Builder Cohorts */}
      <section
        aria-labelledby="cohorts-heading"
        className="rounded-[var(--radius-lg)] bg-[var(--bg-subtle)] px-6 py-8 sm:px-8 sm:py-10"
      >
        <div className="flex items-center gap-2.5">
          <Trophy
            size={20}
            weight="bold"
            className="shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          />
          <h2
            id="cohorts-heading"
            className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-primary)]"
          >
            2026 Hackathons &amp; Selected Builder Cohorts
          </h2>
        </div>

        <div className="mt-7 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {HACKATHONS_AND_PROGRAMS.map((item) => (
            <div
              key={item.name}
              className="border-t border-[var(--border-hairline)] pt-4"
            >
              <div className="font-mono text-[11px] font-medium tabular-nums text-[var(--accent-deep)]">
                {item.organizer} · {item.year}
              </div>
              <h3 className="mt-1.5 text-[15px] font-semibold text-[var(--ink-primary)]">
                {item.name}
              </h3>
              <p className="mt-1.5 text-sm leading-[1.58] text-[var(--ink-secondary)]">
                {item.focus}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
