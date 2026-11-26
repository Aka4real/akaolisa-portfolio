"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { SERVICE_PILLARS, type TrackId } from "@/data/profile";
import { PROJECTS } from "@/data/projects";
import {
  BlurCrossfade,
  ClipSegmentedTabs,
  type SegmentedTabOption,
} from "@/components/ui/MotionPrimitives";

const PILLAR_OPTIONS: ReadonlyArray<SegmentedTabOption<TrackId>> =
  SERVICE_PILLARS.map((pillar) => ({
    value: pillar.id,
    label: pillar.shortLabel,
  }));

const TRACK_CTA_LABELS: Record<TrackId, string> = {
  "full-stack-saas": "Start a SaaS project",
  "ai-agents": "Start an AI agent project",
  "quant-fintech": "Start a quant project",
  "healthtech-biomedical": "Start a HealthTech project",
};

export function CapabilityMatrix() {
  const [activeId, setActiveId] = useState<TrackId>("full-stack-saas");

  const current =
    SERVICE_PILLARS.find((p) => p.id === activeId) ?? SERVICE_PILLARS[0];
  const linkedProjects = PROJECTS.filter((p) =>
    current.featuredSlugs.includes(p.slug)
  );

  return (
    <div>
      {/* Connected Segmented Discipline Selector */}
      <ClipSegmentedTabs
        options={PILLAR_OPTIONS}
        value={activeId}
        onChange={setActiveId}
        ariaLabel="Engineering and biomedical disciplines"
        variant="inverse"
        size="md"
        className="w-full sm:w-auto"
      />

      {/* Open Hairline-Divided Specification Canvas */}
      <div
        role="tabpanel"
        id={`capability-panel-${current.id}`}
        className="mt-10 border-t border-[var(--border-hairline)] pt-10"
      >
        <BlurCrossfade contentKey={current.id}>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
            {/* Left 7 Cols: Benefit Statement, Narrative & Deliverables */}
            <div className="lg:col-span-7">
              <h3 className="type-subhead text-[var(--ink-primary)]">
                {current.tagline}
              </h3>

              <p className="type-body mt-4 max-w-[62ch] text-[var(--ink-secondary)]">
                {current.description}
              </p>

              <div className="mt-8">
                <p className="type-kicker text-[var(--ink-muted)]">
                  Core deliverables
                </p>
                <ul className="mt-4 space-y-3">
                  {current.deliverables.map((item) => (
                    <li
                      key={item}
                      className="type-body flex items-start gap-3 text-[var(--ink-primary)]"
                    >
                      <Check
                        size={17}
                        weight="bold"
                        className="mt-1 shrink-0 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right 5 Cols: Typographic Stack Index, Linked Dossiers & Single Action */}
            <div className="flex flex-col justify-between gap-8 border-t border-[var(--border-hairline)] pt-8 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
              <div>
                <p className="type-kicker text-[var(--ink-muted)]">
                  Production stack
                </p>
                <p className="type-meta mt-3 leading-relaxed text-[var(--ink-secondary)]">
                  {current.stack.join(" · ")}
                </p>
              </div>

              <div className="space-y-6 border-t border-[var(--border-hairline)] pt-6">
                <div>
                  <p className="type-kicker text-[var(--ink-muted)]">
                    Deployed case studies
                  </p>
                  <ul className="mt-2 divide-y divide-[var(--border-hairline)]">
                    {linkedProjects.map((project) => (
                      <li key={project.slug}>
                        <Link
                          href={`/work/${project.slug}`}
                          className="type-body group flex items-center justify-between gap-3 py-3 font-medium text-[var(--ink-primary)] transition-colors duration-150 hover:text-[var(--accent-deep)]"
                        >
                          <span className="min-w-0 truncate">
                            {project.title}
                          </span>
                          <ArrowRight
                            size={15}
                            weight="bold"
                            className="hover-nudge-x shrink-0 text-[var(--ink-muted)] group-hover:text-[var(--accent-deep)]"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <Link
                    href={`/contact?track=${current.id}`}
                    className="btn-press group type-sm inline-flex items-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-5 py-3 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)]"
                  >
                    <span>{TRACK_CTA_LABELS[current.id]}</span>
                    <ArrowRight
                      size={15}
                      weight="bold"
                      className="hover-nudge-x shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </BlurCrossfade>
      </div>
    </div>
  );
}
