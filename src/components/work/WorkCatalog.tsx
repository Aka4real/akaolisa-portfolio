"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  LockSimple,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { PROJECTS } from "@/data/projects";
import type { TrackId } from "@/data/profile";
import { ProjectSchematic } from "@/components/schematics/ProjectSchematic";

type FilterOption = "all" | TrackId;

const FILTER_TABS: { id: FilterOption; label: string }[] = [
  { id: "all", label: "All Systems" },
  { id: "full-stack-saas", label: "Full-Stack SaaS" },
  { id: "ai-agents", label: "AI Agents & LLMs" },
  { id: "quant-fintech", label: "Quant & FinTech" },
];

export function WorkCatalog() {
  const [activeTrack, setActiveTrack] = useState<FilterOption>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PROJECTS.filter((project) => {
      const matchesTrack =
        activeTrack === "all" || project.tracks.includes(activeTrack);
      const matchesQuery =
        !q ||
        project.title.toLowerCase().includes(q) ||
        project.summary.toLowerCase().includes(q) ||
        project.clientDomain.toLowerCase().includes(q) ||
        project.stack.some((tech) => tech.toLowerCase().includes(q));
      return matchesTrack && matchesQuery;
    });
  }, [activeTrack, search]);

  return (
    <div>
      {/* Filter & Search Bar */}
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-lg border border-[#E5E2DC] bg-white p-4 sm:flex-row sm:items-center">
        <div
          role="tablist"
          aria-label="Filter case studies by engineering track"
          className="flex flex-wrap items-center gap-1.5"
        >
          {FILTER_TABS.map((tab) => {
            const active = activeTrack === tab.id;
            const count =
              tab.id === "all"
                ? PROJECTS.length
                : PROJECTS.filter((p) => p.tracks.includes(tab.id as TrackId))
                    .length;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTrack(tab.id)}
                className={`btn-press inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium ${
                  active
                    ? "border-[#1D4ED8] bg-[#EFF4FF] text-[#0F3D91]"
                    : "border-[#E5E2DC] bg-[#FAF9F6] text-[#4B4E54] hover:border-[#D1CDC4] hover:text-[#111214]"
                }`}
              >
                {tab.label}
                <span className="font-mono text-[10px] opacity-75">
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <MagnifyingGlass
            size={14}
            weight="bold"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#6E727A]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter stack (Next.js, pgvector...)"
            aria-label="Filter projects by technology or keyword"
            className="w-full rounded border border-[#E5E2DC] bg-[#FAF9F6] py-1.5 pr-3 pl-8 text-xs text-[#111214] placeholder:text-[#6E727A] focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-[#E5E2DC] bg-white p-10 text-center">
          <p className="text-sm font-medium text-[#111214]">
            No matching systems for &ldquo;{search}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTrack("all");
              setSearch("");
            }}
            className="btn-press mt-3 rounded border border-[#E5E2DC] bg-[#FAF9F6] px-3.5 py-1.5 font-mono text-xs text-[#0F3D91] hover:border-[#1D4ED8]"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {filtered.map((project) => (
            <article
              key={project.slug}
              className="card-hover flex h-full flex-col justify-between rounded-lg border border-[#E5E2DC] bg-white p-6"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-[#6E727A]">
                    {project.indexCode} · {project.year}
                  </span>
                  <div className="flex items-center gap-2">
                    {project.isNda && (
                      <span className="inline-flex items-center gap-1 rounded border border-[#E5E2DC] bg-[#FAF9F6] px-2 py-0.5 font-mono text-[10px] text-[#4B4E54]">
                        <LockSimple size={10} weight="bold" />
                        NDA Anonymized
                      </span>
                    )}
                    <span className="rounded border border-[#BFDBFE] bg-[#EFF4FF] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[#0F3D91]">
                      {project.statusBadge}
                    </span>
                  </div>
                </div>

                <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#111214]">
                  <Link
                    href={`/work/${project.slug}`}
                    className="hover:text-[#1D4ED8]"
                  >
                    {project.title}
                  </Link>
                </h2>
                <p className="mt-0.5 font-mono text-xs text-[#6E727A]">
                  {project.clientDomain}
                </p>

                <p className="mt-3 text-sm leading-relaxed text-[#4B4E54]">
                  {project.summary}
                </p>

                <div className="mt-5">
                  <ProjectSchematic type={project.schematicType} compact />
                </div>

                <div className="mt-5 flex flex-wrap gap-1.5">
                  {project.stack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded border border-[#E5E2DC] bg-[#FAF9F6] px-2 py-0.5 font-mono text-[10.5px] text-[#4B4E54]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E2DC] pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  {project.links.map((ext) => (
                    <a
                      key={ext.href}
                      href={ext.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-[#4B4E54] hover:text-[#1D4ED8]"
                    >
                      {ext.label}
                      <ArrowUpRight size={12} weight="bold" />
                    </a>
                  ))}
                </div>

                <Link
                  href={`/work/${project.slug}`}
                  className="btn-press inline-flex items-center gap-1.5 rounded bg-[#111214] px-3.5 py-2 font-mono text-[11px] font-medium text-white hover:bg-[#1D4ED8]"
                >
                  Open Technical Dossier
                  <ArrowRight size={12} weight="bold" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
