"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  LockSimple,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { PROJECTS } from "@/data/projects";
import type { TrackId } from "@/data/profile";
import { ProjectSchematic } from "@/components/schematics/ProjectSchematic";
import {
  EASE_OUT_EXPO,
  SPRING_TAB,
  StaggerGroup,
  StaggerItem,
} from "@/components/ui/MotionPrimitives";

type FilterOption = "all" | TrackId;

const FILTER_TABS: ReadonlyArray<{ id: FilterOption; label: string }> = [
  { id: "all", label: "All Systems" },
  { id: "full-stack-saas", label: "Full-Stack SaaS" },
  { id: "ai-agents", label: "AI Agents & LLMs" },
  { id: "quant-fintech", label: "Quant & FinTech" },
];

export function WorkCatalog() {
  const prefersReduced = useReducedMotion();
  const [activeTrack, setActiveTrack] = useState<FilterOption>("all");
  const [search, setSearch] = useState("");
  const [triggerMode, setTriggerMode] = useState<"tab" | "search">("tab");
  const triggerModeRef = useRef<"tab" | "search">("tab");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const trackCounts = useMemo(() => {
    const counts: Record<FilterOption, number> = {
      all: PROJECTS.length,
      "full-stack-saas": 0,
      "ai-agents": 0,
      "quant-fintech": 0,
      "healthtech-biomedical": 0,
    };
    for (const project of PROJECTS) {
      for (const track of project.tracks) {
        counts[track] += 1;
      }
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PROJECTS.filter((project) => {
      const matchesTrack =
        activeTrack === "all" || project.tracks.includes(activeTrack);
      const matchesQuery =
        !q ||
        project.title.toLowerCase().includes(q) ||
        project.subtitle.toLowerCase().includes(q) ||
        project.summary.toLowerCase().includes(q) ||
        project.clientDomain.toLowerCase().includes(q) ||
        project.stack.some((tech) => tech.toLowerCase().includes(q));
      return matchesTrack && matchesQuery;
    });
  }, [activeTrack, search]);

  const activeTrackLabel =
    FILTER_TABS.find((t) => t.id === activeTrack)?.label ?? "All Systems";

  function selectTrack(next: FilterOption) {
    triggerModeRef.current = "tab";
    setTriggerMode("tab");
    setActiveTrack(next);
  }

  function updateSearch(next: string) {
    triggerModeRef.current = "search";
    setTriggerMode("search");
    setSearch(next);
  }

  function clearSearch() {
    triggerModeRef.current = "search";
    setTriggerMode("search");
    setSearch("");
    searchInputRef.current?.focus();
  }

  function resetAllFilters() {
    triggerModeRef.current = "tab";
    setTriggerMode("tab");
    setActiveTrack("all");
    setSearch("");
  }

  function handleTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") {
      nextIdx = (idx + 1) % FILTER_TABS.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (idx - 1 + FILTER_TABS.length) % FILTER_TABS.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = FILTER_TABS.length - 1;
    }

    if (nextIdx !== null) {
      e.preventDefault();
      const target = FILTER_TABS[nextIdx];
      if (target) {
        selectTrack(target.id);
        tabRefs.current[nextIdx]?.focus();
      }
    }
  }

  return (
    <div>
      {/* Open Control Bar: Track Filter Rail + High-Contrast Search */}
      <div className="mb-9 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <LayoutGroup id="work-filters">
          <div
            role="tablist"
            aria-label="Filter case studies by engineering track"
            className="inline-flex flex-wrap items-center gap-1 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] p-1.5"
          >
            {FILTER_TABS.map((tab, idx) => {
              const active = activeTrack === tab.id;
              const count = trackCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => selectTrack(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`btn-press relative inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3.5 py-2 text-xs font-medium whitespace-nowrap select-none ${
                    active
                      ? "text-[var(--ink-primary)]"
                      : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="work-filter-bg"
                      transition={prefersReduced ? { duration: 0 } : SPRING_TAB}
                      className="pointer-events-none absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] shadow-[0_1px_2px_rgba(15,20,30,0.06),0_2px_8px_rgba(15,20,30,0.04)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                  <span
                    className={`relative z-10 font-mono text-[11px] tabular-nums ${
                      active
                        ? "text-[var(--accent-deep)]"
                        : "text-[var(--ink-muted)]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        <div className="relative w-full lg:w-72">
          <MagnifyingGlass
            size={15}
            weight="bold"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="text"
            role="searchbox"
            inputMode="search"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Filter stack (Next.js, pgvector...)"
            aria-label="Filter projects by technology or keyword"
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] py-2.5 pr-9 pl-9.5 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-ring)] focus:outline-none"
          />
          <div className="absolute top-1/2 right-2 -translate-y-1/2">
            <AnimatePresence>
              {search.length > 0 && (
                <motion.button
                  key="clear-work-search"
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search query"
                  initial={
                    prefersReduced
                      ? { opacity: 0 }
                      : { opacity: 0, transform: "scale(0.92)" }
                  }
                  animate={
                    prefersReduced
                      ? { opacity: 1 }
                      : { opacity: 1, transform: "scale(1)" }
                  }
                  exit={
                    prefersReduced
                      ? { opacity: 0 }
                      : { opacity: 0, transform: "scale(0.92)" }
                  }
                  transition={{ duration: 0.14, ease: EASE_OUT_EXPO }}
                  className="btn-press inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]"
                >
                  <X size={13} weight="bold" aria-hidden="true" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {filtered.length}{" "}
        {filtered.length === 1 ? "system dossier" : "system dossiers"} in{" "}
        {activeTrackLabel}.
      </p>

      {/* Results Grid (0ms instant update on keyboard search; smooth cascade on track tab switch) */}
      {filtered.length === 0 ? (
        <div className="surface-elevated rounded-[var(--radius-md)] px-6 py-14 text-center">
          <p className="text-base font-semibold text-[var(--ink-primary)]">
            No matching dossiers for &ldquo;{search.trim()}&rdquo;
            {activeTrack !== "all" ? ` in ${activeTrackLabel}` : ""}.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-secondary)]">
            Try another stack keyword such as Next.js, PostgreSQL, Python, or
            Gemini, or reset filters to view all {PROJECTS.length} shipped
            systems.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="btn-press mt-5 inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-4 py-2 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)]"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <StaggerGroup
          key={
            triggerMode === "search" ? "work-search-instant" : `work-tab-${activeTrack}`
          }
          trigger={triggerMode === "search" ? "instant" : "mount"}
          staggerStep={0.035}
          maxDelay={0.14}
          y={8}
          className="grid gap-7 lg:grid-cols-2"
        >
          {filtered.map((project, idx) => (
            <StaggerItem key={project.slug} index={idx} className="h-full">
              <article className="surface-elevated card-hover flex h-full flex-col justify-between rounded-[var(--radius-md)] p-6 sm:p-7">
                <div>
                  {/* Single-Line Non-Wrapping Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                      <span className="shrink-0 font-semibold text-[var(--ink-secondary)]">
                        {project.indexCode}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-[var(--border-strong)]"
                      >
                        ·
                      </span>
                      <span className="truncate">{project.year}</span>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-xs)] px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                        project.isNda
                          ? "bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
                          : "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                      }`}
                    >
                      {project.isNda && (
                        <LockSimple
                          size={11}
                          weight="bold"
                          aria-hidden="true"
                        />
                      )}
                      {project.statusBadge}
                    </span>
                  </div>

                  <h2 className="mt-3.5 text-xl font-semibold leading-[1.25] tracking-[-0.02em] text-[var(--ink-primary)]">
                    <Link
                      href={`/work/${project.slug}`}
                      className="transition-colors duration-150 hover:text-[var(--accent-deep)]"
                    >
                      {project.title}
                    </Link>
                  </h2>

                  <p className="mt-1 truncate text-xs font-medium text-[var(--ink-muted)]">
                    {project.clientDomain}
                  </p>

                  <p className="mt-3.5 text-[15px] leading-[1.6] text-[var(--ink-secondary)]">
                    {project.summary}
                  </p>

                  {/* Inner wrapper holds overflow-hidden so .card-hover::after shadow is never clipped */}
                  <div className="mt-5 overflow-hidden rounded-[var(--radius-sm)]">
                    <ProjectSchematic type={project.schematicType} compact />
                  </div>

                  {/* Max 5 Stack Tags */}
                  <div className="mt-5 flex flex-wrap items-center gap-1.5">
                    {project.stack.slice(0, 5).map((tech) => (
                      <span
                        key={tech}
                        className="rounded-[var(--radius-xs)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-secondary)]"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.stack.length > 5 && (
                      <span className="px-1 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                        +{project.stack.length - 5}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-4">
                  <div className="flex flex-wrap items-center gap-3.5">
                    {project.links.map((ext) => (
                      <a
                        key={ext.href}
                        href={ext.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1 font-mono text-xs text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--accent-deep)]"
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

                  <Link
                    href={`/work/${project.slug}`}
                    className="btn-press group inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-3.5 py-2 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)]"
                  >
                    <span>Inspect Dossier</span>
                    <ArrowRight
                      size={13}
                      weight="bold"
                      className="hover-nudge-x shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </div>
  );
}
