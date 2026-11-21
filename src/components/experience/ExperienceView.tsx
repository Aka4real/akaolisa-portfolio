"use client";

import { useState } from "react";
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
import { usePortfolioActions } from "@/components/layout/PortfolioShell";

type ExpFilter = "all" | ExperienceCategory;

export function ExperienceView() {
  const [filter, setFilter] = useState<ExpFilter>("all");
  const { openResume } = usePortfolioActions();

  const visibleItems = EXPERIENCE_ITEMS.filter((item) =>
    filter === "all" ? true : item.category === filter
  );

  return (
    <div className="space-y-14">
      {/* Inline Resume Utility Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-[#D1CDC4] bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-widest text-[#0F3D91]">
            Complete Curriculum Vitae
          </p>
          <p className="mt-1 text-sm text-[#4B4E54]">
            Preview or download the streamlined 3-page PDF dossier directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openResume}
            className="btn-press inline-flex items-center gap-1.5 rounded border border-[#E5E2DC] bg-[#FAF9F6] px-4 py-2 text-xs font-medium text-[#111214] hover:border-[#1D4ED8] hover:text-[#0F3D91]"
          >
            <FilePdf size={15} weight="bold" />
            Preview PDF
          </button>
          <a
            href={PROFILE.resumePdfPath}
            download={PROFILE.resumeFileName}
            className="btn-press inline-flex items-center gap-1.5 rounded bg-[#111214] px-4 py-2 text-xs font-medium text-white hover:bg-[#1D4ED8]"
          >
            <DownloadSimple size={15} weight="bold" />
            Download Resume
          </a>
        </div>
      </div>

      {/* Professional & Clinical Timeline */}
      <section>
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
              01 / Career &amp; Clinical Trajectory
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-[#111214]">
              Engineering, AI Training &amp; Clinical Leadership
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Filter experience by discipline"
            className="inline-flex rounded border border-[#E5E2DC] bg-white p-1"
          >
            {(
              [
                { id: "all", label: "All Roles" },
                { id: "software-ai", label: "Software & AI" },
                { id: "clinical-biomedical", label: "Clinical & Lab" },
              ] as const
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  className={`btn-press rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-[#111214] text-white"
                      : "text-[#4B4E54] hover:text-[#111214]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-[#E5E2DC] bg-white p-6"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-[#F3F1EC] pb-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded border border-[#E5E2DC] bg-[#FAF9F6] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#4B4E54]">
                      {item.category === "software-ai" ? (
                        <Code size={11} weight="bold" className="text-[#1D4ED8]" />
                      ) : (
                        <Flask size={11} weight="bold" className="text-[#1D4ED8]" />
                      )}
                      {item.category === "software-ai"
                        ? "Software & AI"
                        : "Clinical & Biomedical"}
                    </span>
                    {item.highlightBadge && (
                      <span className="rounded border border-[#BFDBFE] bg-[#EFF4FF] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#0F3D91]">
                        {item.highlightBadge}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2.5 text-lg font-semibold tracking-tight text-[#111214]">
                    {item.organization}
                  </h3>
                  <p className="text-sm font-medium text-[#4B4E54]">
                    {item.role}
                  </p>
                </div>

                <div className="font-mono text-xs text-[#6E727A] sm:text-right">
                  <div className="font-semibold text-[#111214]">
                    {item.period}
                  </div>
                  <div className="mt-0.5">{item.location}</div>
                </div>
              </div>

              <ul className="mt-4 space-y-2.5">
                {item.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="border-l-2 border-[#E5E2DC] pl-3.5 text-sm leading-relaxed text-[#4B4E54]"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>

              {item.links && item.links.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3 pt-1">
                  {item.links.map((ext) => (
                    <a
                      key={ext.href}
                      href={ext.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs font-medium text-[#0F3D91] hover:text-[#1D4ED8]"
                    >
                      {ext.label}
                      <ArrowUpRight size={13} weight="bold" />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Education, Research & Languages Grid */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Education & Research Thesis */}
        <div className="rounded-lg border border-[#E5E2DC] bg-white p-6 sm:p-7 lg:col-span-7">
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
            <GraduationCap size={15} weight="bold" />
            02 / Education &amp; Clinical Research
          </div>

          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#111214]">
            {EDUCATION.degree}
          </h2>
          <p className="mt-1 font-mono text-xs text-[#4B4E54]">
            {EDUCATION.specialization} · {EDUCATION.institution}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-[#E5E2DC] bg-[#FAF9F6] p-4">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6E727A]">
                Research Thesis ({EDUCATION.thesisYear})
              </div>
              <p className="mt-1.5 text-sm font-medium leading-snug text-[#111214]">
                {EDUCATION.thesisTitle}
              </p>
            </div>
            <div className="rounded border border-[#E5E2DC] bg-[#FAF9F6] p-4">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6E727A]">
                Clinical Seminar ({EDUCATION.seminarYear})
              </div>
              <p className="mt-1.5 text-sm font-medium leading-snug text-[#111214]">
                {EDUCATION.seminarTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Languages */}
        <div className="rounded-lg border border-[#E5E2DC] bg-white p-6 sm:p-7 lg:col-span-5">
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
            <Translate size={15} weight="bold" />
            03 / Languages &amp; Communication
          </div>

          <ul className="mt-5 divide-y divide-[#E5E2DC] border-t border-[#E5E2DC]">
            {LANGUAGES.map((lang) => (
              <li key={lang.name} className="py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#111214]">
                    {lang.name}
                  </span>
                  <span className="rounded border border-[#E5E2DC] bg-[#FAF9F6] px-2 py-0.5 font-mono text-[10.5px] text-[#4B4E54]">
                    {lang.proficiency}
                  </span>
                </div>
                {lang.notes && (
                  <p className="mt-1 text-xs text-[#6E727A]">{lang.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2026 Hackathons & Programs */}
      <section className="rounded-lg border border-[#E5E2DC] bg-white p-6 sm:p-7">
        <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
          <Trophy size={15} weight="bold" />
          04 / Hackathons &amp; Selected Builder Programs (2026)
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HACKATHONS_AND_PROGRAMS.map((item) => (
            <div
              key={item.name}
              className="rounded border border-[#E5E2DC] bg-[#FAF9F6] p-4"
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#0F3D91]">
                {item.organizer} · {item.year}
              </div>
              <h3 className="mt-1.5 text-sm font-semibold text-[#111214]">
                {item.name}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#4B4E54]">
                {item.focus}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
