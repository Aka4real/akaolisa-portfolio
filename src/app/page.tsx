import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Flask,
  Trophy,
} from "@phosphor-icons/react/dist/ssr";
import { PROFILE } from "@/data/profile";
import { PROJECTS } from "@/data/projects";
import { HACKATHONS_AND_PROGRAMS } from "@/data/experience";
import { LiveClockBadge } from "@/components/ui/LiveClockBadge";
import { Reveal } from "@/components/ui/MotionPrimitives";
import {
  ClosingCtaButtons,
  HeroActionButtons,
} from "@/components/home/HeroActionButtons";
import { CapabilityMatrix } from "@/components/home/CapabilityMatrix";
import { ProjectSchematic } from "@/components/schematics/ProjectSchematic";

export default function HomePage() {
  const featuredProjects = PROJECTS.filter((p) => p.featured);

  return (
    <div>
      {/* HERO SECTION */}
      <section className="border-b border-[#E5E2DC] bg-[#FAF9F6]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-22 lg:px-8 lg:py-26">
          <div className="grid items-start gap-12 lg:grid-cols-12">
            {/* Left Editorial Spine */}
            <div className="lg:col-span-7">
              <LiveClockBadge />

              <p className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-[#0F3D91]">
                {PROFILE.displayName} · Founder, {PROFILE.studio.name}
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[#111214] sm:text-5xl lg:text-[56px] lg:leading-[1.06]">
                Full-Stack SaaS, AI Agents &amp; Quantitative Systems{" "}
                <span className="font-serif font-normal italic text-[#0F3D91]">
                  built with clinical rigor.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#4B4E54] sm:text-[17px]">
                {PROFILE.bioShort}
              </p>

              <p className="mt-4 max-w-xl border-l-2 border-[#1D4ED8] pl-4 text-sm leading-relaxed text-[#4B4E54]">
                {PROFILE.empiricalEdge}
              </p>

              <HeroActionButtons />
            </div>

            {/* Right Clinical Swiss Engineering Dossier Panel */}
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-lg border border-[#E5E2DC] bg-white">
                <div className="flex items-center justify-between border-b border-[#E5E2DC] bg-[#F3F1EC]/70 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-wider text-[#4B4E54]">
                  <span>SPECIMEN DOSSIER · AE-2026</span>
                  <span className="text-[#1D4ED8]">VERIFIED</span>
                </div>

                {/* Optional Portrait Slot OR Architectural Identity Block */}
                <div className="swiss-grid-bg border-b border-[#E5E2DC] p-5">
                  {PROFILE.portraitUrl ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded border border-[#E5E2DC]">
                      <Image
                        src={PROFILE.portraitUrl}
                        alt={PROFILE.displayName}
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4 rounded border border-[#E5E2DC] bg-white p-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[#6E727A]">
                          Principal Engineer &amp; Scientist
                        </p>
                        <p className="mt-1 text-lg font-semibold tracking-tight text-[#111214]">
                          {PROFILE.legalName}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-[#4B4E54]">
                          B.MLS (Clinical Chemistry) · {PROFILE.studio.primaryDisplay}
                        </p>
                      </div>
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-[#111214] bg-[#111214] font-mono text-lg font-semibold tracking-tight text-white">
                        {PROFILE.monogram}
                      </div>
                    </div>
                  )}
                </div>

                {/* Verified Metrics 2x2 Grid */}
                <div className="grid grid-cols-2 divide-x divide-y divide-[#E5E2DC]">
                  {PROFILE.metrics.map((metric) => (
                    <div key={metric.label} className="p-4">
                      <div className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-[#111214]">
                        {metric.value}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[#111214]">
                        {metric.label}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-snug text-[#6E727A]">
                        {metric.detail}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Direct Links Rail */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E2DC] bg-[#FAF9F6] px-4 py-3 font-mono text-[11px]">
                  <a
                    href={PROFILE.studio.primaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#111214] hover:text-[#1D4ED8]"
                  >
                    {PROFILE.studio.primaryDisplay}
                    <ArrowUpRight size={12} weight="bold" />
                  </a>
                  <a
                    href={PROFILE.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#111214] hover:text-[#1D4ED8]"
                  >
                    {PROFILE.githubHandle}
                    <ArrowUpRight size={12} weight="bold" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE 4-PILLAR CAPABILITY MATRIX */}
      <section className="border-b border-[#E5E2DC] bg-[#FAF9F6] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
                  01 / Client Service Pillars
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111214] sm:text-3xl">
                  Four integrated engineering &amp; scientific verticals.
                </h2>
              </div>
              <p className="max-w-md text-sm text-[#4B4E54]">
                Switch tracks to inspect production frameworks, architectural
                deliverables, and verified systems shipped across each discipline.
              </p>
            </div>

            <CapabilityMatrix />
          </Reveal>
        </div>
      </section>

      {/* FEATURED SELECTED WORK */}
      <section className="border-b border-[#E5E2DC] bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
                  02 / Selected Shipped Systems
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111214] sm:text-3xl">
                  Production architecture &amp; client case studies.
                </h2>
              </div>

              <Link
                href="/work"
                className="btn-press inline-flex items-center gap-1.5 rounded border border-[#E5E2DC] bg-[#FAF9F6] px-4 py-2 font-mono text-xs font-medium text-[#111214] hover:border-[#1D4ED8] hover:text-[#0F3D91]"
              >
                View All {PROJECTS.length} Systems
                <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2">
            {featuredProjects.map((project, idx) => (
              <Reveal key={project.slug} delay={idx * 0.05}>
                <article className="card-hover flex h-full flex-col justify-between rounded-lg border border-[#E5E2DC] bg-[#FAF9F6] p-5 sm:p-6">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-[#6E727A]">
                        {project.indexCode} · {project.clientDomain}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${
                          project.isNda
                            ? "border-[#E5E2DC] bg-white text-[#4B4E54]"
                            : "border-[#BFDBFE] bg-[#EFF4FF] text-[#0F3D91]"
                        }`}
                      >
                        {project.statusBadge}
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#111214]">
                      <Link
                        href={`/work/${project.slug}`}
                        className="hover:text-[#1D4ED8]"
                      >
                        {project.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#4B4E54]">
                      {project.summary}
                    </p>

                    <div className="mt-5">
                      <ProjectSchematic type={project.schematicType} compact />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E2DC] pt-4">
                    <div className="flex flex-wrap gap-1.5">
                      {project.stack.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="rounded border border-[#E5E2DC] bg-white px-2 py-0.5 font-mono text-[10.5px] text-[#4B4E54]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/work/${project.slug}`}
                      className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#0F3D91] hover:text-[#1D4ED8]"
                    >
                      Inspect Dossier
                      <ArrowRight size={13} weight="bold" />
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* EMPIRICAL RIGOR, STUDIO & 2026 HACKATHONS */}
      <section className="border-b border-[#E5E2DC] bg-[#FAF9F6] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left: Clinical & Empirical Edge */}
              <div className="rounded-lg border border-[#E5E2DC] bg-white p-6 sm:p-8 lg:col-span-6">
                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
                  <Flask size={15} weight="bold" />
                  03 / Empirical Edge &amp; Leadership
                </div>

                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111214]">
                  Why a licensed Biomedical Scientist ships sharper production software.
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-[#4B4E54]">
                  At Federal Medical Centre (FMC) Umuahia, I coordinate bench
                  schedules, onboarding, and diagnostic workflows for{" "}
                  <strong className="font-semibold text-[#111214]">
                    100+ Medical Laboratory Science interns
                  </strong>{" "}
                  and supervise{" "}
                  <strong className="font-semibold text-[#111214]">
                    150+ university trainees
                  </strong>{" "}
                  while running IQC/EQA analyzer calibration. Alongside RLHF
                  benchmarking at Outlier.ai and OneForma, this laboratory
                  precision directly shapes how I design database invariants,
                  agent guardrails, and quantitative risk models.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#E5E2DC] pt-5">
                  <div className="rounded border border-[#E5E2DC] bg-[#FAF9F6] p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[#6E727A]">
                      Studio Venture
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#111214]">
                      {PROFILE.studio.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#4B4E54]">
                      2022 — Present
                    </div>
                  </div>
                  <div className="rounded border border-[#E5E2DC] bg-[#FAF9F6] p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[#6E727A]">
                      Frontier RLHF
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#111214]">
                      Outlier.ai &amp; OneForma
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#4B4E54]">
                      Code, Quant &amp; Clinical
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href="/experience"
                    className="btn-press inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#0F3D91] hover:text-[#1D4ED8]"
                  >
                    Read Full Experience, Thesis &amp; Clinical Credentials
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                </div>
              </div>

              {/* Right: 2026 Hackathons & Early Access Programs */}
              <div className="rounded-lg border border-[#E5E2DC] bg-white p-6 sm:p-8 lg:col-span-6">
                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
                  <Trophy size={15} weight="bold" />
                  04 / 2026 Hackathons &amp; Cohorts
                </div>

                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111214]">
                  Selected builder programs &amp; agentic competitions.
                </h2>

                <ul className="mt-5 divide-y divide-[#E5E2DC] border-t border-[#E5E2DC]">
                  {HACKATHONS_AND_PROGRAMS.map((item) => (
                    <li
                      key={item.name}
                      className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[#111214]">
                          {item.name}
                        </div>
                        <div className="text-xs text-[#4B4E54]">
                          {item.focus}
                        </div>
                      </div>
                      <span className="w-fit shrink-0 rounded border border-[#E5E2DC] bg-[#FAF9F6] px-2 py-0.5 font-mono text-[10px] text-[#6E727A]">
                        {item.organizer} · {item.year}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CLOSING CONVERSION BAND */}
      <section className="bg-white py-18 sm:py-22">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-8 rounded-lg border border-[#D1CDC4] bg-[#FAF9F6] p-8 sm:p-10 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
                Available Worldwide · {PROFILE.utcOffsetLabel}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111214] sm:text-3xl">
                Need a principal engineer to architect and ship your next system?
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[#4B4E54]">
                Available for remote freelance contracts, SaaS MVP builds,
                multi-agent AI systems, quantitative trading utilities, and
                HealthTech engineering advisory.
              </p>
            </div>

            <ClosingCtaButtons />
          </div>
        </div>
      </section>
    </div>
  );
}
