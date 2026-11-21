"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  ChartLineUp,
  CheckCircle,
  Flask,
  Stack,
} from "@phosphor-icons/react";
import { SERVICE_PILLARS, type TrackId } from "@/data/profile";
import { PROJECTS } from "@/data/projects";

function TrackIcon({ id, active }: { id: TrackId; active: boolean }) {
  const cls = active ? "text-[#1D4ED8]" : "text-[#6E727A]";
  switch (id) {
    case "full-stack-saas":
      return <Stack size={17} weight="bold" className={cls} />;
    case "ai-agents":
      return <Brain size={17} weight="bold" className={cls} />;
    case "quant-fintech":
      return <ChartLineUp size={17} weight="bold" className={cls} />;
    case "healthtech-biomedical":
      return <Flask size={17} weight="bold" className={cls} />;
  }
}

export function CapabilityMatrix() {
  const [activeId, setActiveId] = useState<TrackId>("full-stack-saas");
  const current =
    SERVICE_PILLARS.find((p) => p.id === activeId) ?? SERVICE_PILLARS[0];
  const linkedProjects = PROJECTS.filter((p) =>
    current.featuredSlugs.includes(p.slug)
  );

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E2DC] bg-white">
      {/* Pillar Selector Tabs */}
      <div
        role="tablist"
        aria-label="Engineering and Biomedical Service Pillars"
        className="grid grid-cols-1 divide-y divide-[#E5E2DC] border-b border-[#E5E2DC] bg-[#FAF9F6] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x"
      >
        {SERVICE_PILLARS.map((pillar) => {
          const active = pillar.id === activeId;
          return (
            <button
              key={pillar.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveId(pillar.id)}
              className={`btn-press relative flex flex-col items-start gap-1.5 px-5 py-4 text-left transition-colors ${
                active
                  ? "bg-white text-[#111214]"
                  : "text-[#4B4E54] hover:bg-[#F3F1EC]/80 hover:text-[#111214]"
              }`}
            >
              {active && (
                <span
                  className="absolute top-0 right-0 left-0 h-[2px] bg-[#1D4ED8]"
                  aria-hidden="true"
                />
              )}
              <div className="flex w-full items-center justify-between">
                <span className="font-mono text-[10px] font-semibold tracking-widest text-[#6E727A]">
                  PILLAR {pillar.code}
                </span>
                <TrackIcon id={pillar.id} active={active} />
              </div>
              <span className="text-sm font-semibold tracking-tight">
                {pillar.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Pillar Specification */}
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#0F3D91]">
            <span>TRACK {current.code}</span>
            <span className="text-[#D1CDC4]">/</span>
            <span>{current.label}</span>
          </div>

          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#111214] sm:text-2xl">
            {current.tagline}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-[#4B4E54]">
            {current.description}
          </p>

          <div className="mt-6">
            <h4 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#6E727A]">
              Core Deliverables
            </h4>
            <ul className="mt-3 space-y-2.5">
              {current.deliverables.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[#111214]"
                >
                  <CheckCircle
                    size={16}
                    weight="bold"
                    className="mt-0.5 shrink-0 text-[#1D4ED8]"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 border-t border-[#E5E2DC] pt-6 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <div>
            <h4 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#6E727A]">
              Production Tooling &amp; Stack
            </h4>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {current.stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded border border-[#E5E2DC] bg-[#FAF9F6] px-2.5 py-1 font-mono text-[11px] text-[#111214]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-[#E5E2DC] pt-5">
            <h4 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#6E727A]">
              Related Dossiers
            </h4>
            <div className="space-y-2">
              {linkedProjects.map((project) => (
                <Link
                  key={project.slug}
                  href={`/work/${project.slug}`}
                  className="btn-press group flex items-center justify-between rounded border border-[#E5E2DC] bg-[#FAF9F6] px-3 py-2 text-xs font-medium text-[#111214] hover:border-[#1D4ED8] hover:bg-[#EFF4FF]/60"
                >
                  <span>
                    <span className="mr-2 font-mono text-[10px] text-[#6E727A]">
                      {project.indexCode}
                    </span>
                    {project.title}
                  </span>
                  <ArrowRight
                    size={13}
                    weight="bold"
                    className="text-[#6E727A] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1D4ED8]"
                  />
                </Link>
              ))}
            </div>

            <Link
              href={`/contact?track=${current.id}`}
              className="btn-press inline-flex items-center gap-1.5 pt-1 font-mono text-[11px] font-semibold text-[#0F3D91] hover:text-[#1D4ED8]"
            >
              Inquire on {current.shortLabel}
              <ArrowRight size={12} weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
