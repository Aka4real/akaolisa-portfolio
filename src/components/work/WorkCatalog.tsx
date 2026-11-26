"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { PROJECTS } from "@/data/projects";
import type { TrackId } from "@/data/profile";
import { ProjectSchematic } from "@/components/schematics/ProjectSchematic";
import {
  ClipSegmentedTabs,
  StaggerGroup,
  StaggerItem,
  type SegmentedTabOption,
} from "@/components/ui/MotionPrimitives";

type FilterOption = "all" | TrackId;

export function WorkCatalog() {
  const [activeTrack, setActiveTrack] = useState<FilterOption>("all");
  const [search, setSearch] = useState("");
  const [triggerMode, setTriggerMode] = useState<"tab" | "search">("tab");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const trackOptions = useMemo<ReadonlyArray<SegmentedTabOption<FilterOption>>>(
    () => {
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
      return [
        { value: "all", label: "All systems", badge: counts.all },
        {
          value: "full-stack-saas",
          label: "Full-Stack SaaS",
          badge: counts["full-stack-saas"],
        },
        {
          value: "ai-agents",
          label: "AI Agents & LLMs",
          badge: counts["ai-agents"],
        },
        {
          value: "quant-fintech",
          label: "Quant & FinTech",
          badge: counts["quant-fintech"],
        },
      ];
    },
    []
  );

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
    trackOptions.find((t) => t.value === activeTrack)?.label ?? "All systems";

  function selectTrack(next: FilterOption) {
    setTriggerMode("tab");
    setActiveTrack(next);
  }

  function updateSearch(next: string) {
    setTriggerMode("search");
    setSearch(next);
  }

  function clearSearch() {
    setTriggerMode("search");
    setSearch("");
    searchInputRef.current?.focus();
  }

  function resetAllFilters() {
    setTriggerMode("tab");
    setActiveTrack("all");
    setSearch("");
  }

  return (
    <div>
      {/* Control Rail: Connected Segmented Filter + Search */}
      <div className="mb-12 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <ClipSegmentedTabs
          options={trackOptions}
          value={activeTrack}
          onChange={selectTrack}
          ariaLabel="Filter case studies by engineering track"
          variant="inverse"
          size="md"
        />

        <div className="relative w-full lg:w-80">
          <MagnifyingGlass
            size={16}
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
            placeholder="Filter by stack (Next.js, pgvector...)"
            aria-label="Filter projects by technology or keyword"
            className="type-sm w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] py-2.5 pr-9 pl-10 text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-ring)] focus:outline-none"
          />
          {search.length > 0 && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search query"
              className="btn-press absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-xs)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]"
            >
              <X size={14} weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {filtered.length}{" "}
        {filtered.length === 1 ? "system dossier" : "system dossiers"} in{" "}
        {activeTrackLabel}.
      </p>

      {filtered.length === 0 ? (
        <div className="border-y border-[var(--border-hairline)] py-16 text-center">
          <p className="type-subhead text-[var(--ink-primary)]">
            No matching dossiers for &ldquo;{search.trim()}&rdquo;
            {activeTrack !== "all" ? ` in ${activeTrackLabel}` : ""}.
          </p>
          <p className="type-body mx-auto mt-2 max-w-md text-[var(--ink-secondary)]">
            Try another stack keyword such as Next.js, PostgreSQL, Python, or
            Gemini, or reset filters to view all {PROJECTS.length} shipped
            systems.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="btn-press type-sm mt-6 inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-5 py-2.5 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)]"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <StaggerGroup
          key={
            triggerMode === "search"
              ? "work-search-instant"
              : `work-tab-${activeTrack}`
          }
          trigger={triggerMode === "search" ? "instant" : "mount"}
          staggerStep={0.04}
          maxDelay={0.14}
          y={10}
          className="divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)]"
        >
          {filtered.map((project, idx) => (
            <StaggerItem key={project.slug} index={idx}>
              <article className="grid items-center gap-8 py-12 first:pt-2 lg:grid-cols-12 lg:gap-12">
                <div className="min-w-0 lg:col-span-5">
                  <p className="type-sm tabular-nums text-[var(--ink-muted)]">
                    {project.clientDomain} · {project.year} ·{" "}
                    <span
                      className={
                        project.isNda
                          ? "text-[var(--ink-secondary)]"
                          : "font-medium text-[var(--accent-deep)]"
                      }
                    >
                      {project.statusBadge}
                    </span>
                  </p>

                  <h2 className="type-heading mt-3 text-[var(--ink-primary)]">
                    <Link
                      href={`/work/${project.slug}`}
                      className="transition-colors duration-150 hover:text-[var(--accent-deep)]"
                    >
                      {project.title}
                    </Link>
                  </h2>

                  <p className="type-body mt-3.5 max-w-[54ch] text-[var(--ink-secondary)]">
                    {project.summary}
                  </p>

                  <p className="type-sm mt-4 text-[var(--ink-muted)]">
                    {project.stack.slice(0, 5).join(" · ")}
                    {project.stack.length > 5
                      ? ` · +${project.stack.length - 5} more`
                      : ""}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <Link
                      href={`/work/${project.slug}`}
                      className="type-body group inline-flex items-center gap-1.5 font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
                    >
                      <span>Inspect dossier</span>
                      <ArrowRight
                        size={15}
                        weight="bold"
                        className="hover-nudge-x shrink-0"
                        aria-hidden="true"
                      />
                    </Link>

                    {project.links.map((ext) => (
                      <a
                        key={ext.href}
                        href={ext.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="type-sm group inline-flex items-center gap-1 text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--ink-primary)]"
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
                </div>

                <div className="min-w-0 lg:col-span-7">
                  <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                    <ProjectSchematic type={project.schematicType} compact />
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </div>
  );
}
