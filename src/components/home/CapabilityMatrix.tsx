"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  ChartLineUp,
  CheckCircle,
  Flask,
  HardDrives,
  Stack,
} from "@phosphor-icons/react";
import { SERVICE_PILLARS, type TrackId } from "@/data/profile";
import { PROJECTS } from "@/data/projects";
import { BlurCrossfade, SPRING_TAB } from "@/components/ui/MotionPrimitives";

const TRACK_CTA_LABELS: Record<TrackId, string> = {
  "full-stack-saas": "Start a SaaS Project",
  "devops-cloud": "Start a DevOps Project",
  "ai-agents": "Start an AI Project",
  "quant-fintech": "Start a Quant Project",
  "healthtech-biomedical": "Start a HealthTech Project",
};

function TrackIcon({ id, active }: { id: TrackId; active: boolean }) {
  const cls = active
    ? "shrink-0 text-[var(--accent)]"
    : "shrink-0 text-[var(--ink-muted)]";
  switch (id) {
    case "full-stack-saas":
      return <Stack size={16} weight="bold" className={cls} aria-hidden="true" />;
    case "devops-cloud":
      return (
        <HardDrives size={16} weight="bold" className={cls} aria-hidden="true" />
      );
    case "ai-agents":
      return <Brain size={16} weight="bold" className={cls} aria-hidden="true" />;
    case "quant-fintech":
      return (
        <ChartLineUp size={16} weight="bold" className={cls} aria-hidden="true" />
      );
    case "healthtech-biomedical":
      return <Flask size={16} weight="bold" className={cls} aria-hidden="true" />;
  }
}

export function CapabilityMatrix() {
  const prefersReduced = useReducedMotion();
  const [activeId, setActiveId] = useState<TrackId>("full-stack-saas");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const current =
    SERVICE_PILLARS.find((p) => p.id === activeId) ?? SERVICE_PILLARS[0];
  const linkedProjects = PROJECTS.filter((p) =>
    current.featuredSlugs.includes(p.slug)
  );

  const handleKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    let nextIndex: number | null = null;

    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % SERVICE_PILLARS.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + SERVICE_PILLARS.length) % SERVICE_PILLARS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = SERVICE_PILLARS.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const target = SERVICE_PILLARS[nextIndex];
      if (target) {
        setActiveId(target.id);
        tabRefs.current[nextIndex]?.focus();
      }
    }
  };

  return (
    <div>
      {/* Apple-Style Segmented Control Rail */}
      <LayoutGroup id="capability-tabs">
        <div
          role="tablist"
          aria-label="Engineering and Biomedical Disciplines"
          className="grid grid-cols-2 gap-1 rounded-[12px] bg-[var(--bg-subtle)] p-1 sm:grid-cols-3 lg:grid-cols-5"
        >
          {SERVICE_PILLARS.map((pillar, idx) => {
            const active = pillar.id === activeId;
            return (
              <button
                key={pillar.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={`capability-tab-${pillar.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`capability-panel-${pillar.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveId(pillar.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`btn-press relative flex items-center justify-center gap-2 rounded-[9px] px-3 py-2.5 text-center text-xs font-medium select-none sm:text-[13px] lg:justify-start lg:px-3.5 lg:text-left ${
                  idx === SERVICE_PILLARS.length - 1 ? "col-span-2 sm:col-span-1" : ""
                } ${
                  active
                    ? "text-[var(--ink-primary)]"
                    : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="capability-active-pill"
                    transition={prefersReduced ? { duration: 0 } : SPRING_TAB}
                    className="pointer-events-none absolute inset-0 rounded-[9px] bg-[var(--bg-surface)] shadow-[0_1px_2px_rgba(15,20,30,0.06),0_2px_8px_-2px_rgba(15,20,30,0.05)] ring-1 ring-inset ring-[rgba(15,20,30,0.05)]"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">
                  <TrackIcon id={pillar.id} active={active} />
                  <span className="leading-snug">{pillar.shortLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      {/* Open 12-Col Borderless Specification Canvas */}
      <div
        role="tabpanel"
        id={`capability-panel-${current.id}`}
        aria-labelledby={`capability-tab-${current.id}`}
        className="mt-8 lg:mt-10"
      >
        <BlurCrossfade contentKey={current.id}>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left 7 Cols: Tagline, Scope & Deliverables */}
            <div className="lg:col-span-7">
              <h3 className="text-[22px] font-semibold leading-[1.24] tracking-[-0.02em] text-[var(--ink-primary)] sm:text-[26px]">
                {current.tagline}
              </h3>

              <p className="mt-3.5 max-w-[60ch] text-[15px] leading-[1.65] text-[var(--ink-secondary)] sm:text-base">
                {current.description}
              </p>

              <div className="mt-8">
                <h4 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  Core Deliverables
                </h4>
                <ul className="mt-4 space-y-3">
                  {current.deliverables.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[15px] leading-[1.55] text-[var(--ink-primary)]"
                    >
                      <CheckCircle
                        size={17}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right 5 Cols: Production Stack, Linked Dossiers & Track Inquiry */}
            <div className="flex flex-col justify-between gap-8 border-t border-[var(--border-hairline)] pt-8 lg:col-span-5 lg:border-t-0 lg:border-l lg:border-[var(--border-hairline)] lg:pt-0 lg:pl-8">
              <div>
                <h4 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  Production Stack
                </h4>
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {current.stack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-[var(--radius-xs)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--ink-primary)]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-5 border-t border-[var(--border-hairline)] pt-6">
                <div>
                  <h4 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                    Linked Dossiers
                  </h4>
                  <ul className="mt-2.5 divide-y divide-[var(--border-hairline)]">
                    {linkedProjects.map((project) => (
                      <li key={project.slug}>
                        <Link
                          href={`/work/${project.slug}`}
                          className="btn-press group flex items-center justify-between gap-3 py-2.5 text-sm font-medium text-[var(--ink-primary)] hover:text-[var(--accent-deep)]"
                        >
                          <span className="min-w-0 truncate">
                            <span className="mr-2 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                              {project.indexCode}
                            </span>
                            {project.title}
                          </span>
                          <ArrowRight
                            size={14}
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
                    className="btn-press group inline-flex items-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-4 py-2.5 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)]"
                  >
                    {TRACK_CTA_LABELS[current.id]}
                    <ArrowRight
                      size={14}
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
