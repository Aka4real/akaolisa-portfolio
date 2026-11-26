import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PROFILE } from "@/data/profile";
import { PROJECTS, type ProjectDossier } from "@/data/projects";
import { HACKATHONS_AND_PROGRAMS } from "@/data/experience";
import { Reveal } from "@/components/ui/MotionPrimitives";
import {
  ClosingCtaButtons,
  HeroActionButtons,
} from "@/components/home/HeroActionButtons";
import { CapabilityMatrix } from "@/components/home/CapabilityMatrix";
import { ProjectSchematic } from "@/components/schematics/ProjectSchematic";

function ProjectCardMetadata({ project }: { project: ProjectDossier }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 truncate font-mono text-[11px] font-medium tabular-nums text-[var(--ink-muted)]">
        {project.indexCode} · {project.clientDomain}
      </span>
      <span
        className={`shrink-0 whitespace-nowrap rounded-[var(--radius-xs)] px-2 py-0.5 font-mono text-[11px] font-medium ${
          project.isNda
            ? "bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
            : "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
        }`}
      >
        {project.statusBadge}
      </span>
    </div>
  );
}

export default function HomePage() {
  const leadProject =
    PROJECTS.find((p) => p.slug === "koridor-engine-os") ?? PROJECTS[0];
  const pairProjects = [
    PROJECTS.find((p) => p.slug === "fortress-fleet-ai"),
    PROJECTS.find((p) => p.slug === "institutional-crypto-wealth"),
  ].filter((p): p is ProjectDossier => Boolean(p));
  const quantProject =
    PROJECTS.find((p) => p.slug === "quant-forex-crypto-hft") ?? PROJECTS[4];

  return (
    <div>
      {/* BAND 1: ASYMMETRIC 7/5 EDITORIAL HERO */}
      <section className="bg-[var(--bg-canvas)] pt-10 pb-14 lg:pt-14 lg:pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,7.4fr)_minmax(0,4.6fr)] lg:gap-8">
            {/* Left 7-Col Strict 3-Element Stack */}
            <div className="min-w-0">
              <h1 className="text-[clamp(2.15rem,3.2vw,2.625rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--ink-primary)] text-balance">
                Engineering SaaS, AI agents &amp;{" "}
                <br className="hidden lg:inline" />
                quant systems with{" "}
                <span className="text-[var(--accent-deep)]">
                  clinical rigor.
                </span>
              </h1>

              <p className="mt-5 max-w-[54ch] text-base leading-[1.6] text-[var(--ink-secondary)] sm:text-[17px]">
                {PROFILE.bioShort}
              </p>

              <HeroActionButtons />
            </div>

            {/* Right 5-Col Art-Directed Visual Anchor + Borderless Metric Ledger */}
            <div className="min-w-0">
              <div className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-surface)] shadow-[var(--shadow-surface)]">
                <Image
                  src="/images/hero-systems.jpg"
                  alt="Minimalist frosted borosilicate glass, machined aluminum calibration blocks, and cobalt optical refraction"
                  width={1200}
                  height={896}
                  priority
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="block h-auto w-full object-cover"
                />
              </div>

              <dl className="mt-5 grid grid-cols-2 border-t border-[var(--border-hairline)] pt-4 sm:grid-cols-4">
                {PROFILE.metrics.map((metric, idx) => (
                  <div
                    key={metric.label}
                    className={`flex flex-col-reverse justify-end ${
                      idx === 0
                        ? "pr-3 pb-3 sm:py-0 sm:pr-3 sm:pl-0"
                        : idx === 1
                          ? "border-l border-[var(--border-hairline)] pb-3 pl-3.5 sm:px-3 sm:py-0"
                          : idx === 2
                            ? "border-t border-[var(--border-hairline)] pt-3 pr-3 sm:border-t-0 sm:border-l sm:px-3 sm:py-0"
                            : "border-t border-l border-[var(--border-hairline)] pt-3 pl-3.5 sm:border-t-0 sm:py-0 sm:pr-0 sm:pl-3"
                    }`}
                  >
                    <dt className="mt-0.5 text-[11px] leading-[1.35] text-[var(--ink-muted)]">
                      {metric.label}
                    </dt>
                    <dd className="font-mono text-[17px] font-semibold tracking-tight tabular-nums text-[var(--ink-primary)] sm:text-lg">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* BAND 2: FULL-WIDTH SEGMENTED CAPABILITY WORKBENCH */}
      <section className="border-y border-[var(--border-hairline)] bg-[var(--bg-surface)] py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-10 max-w-[60ch]">
              <h2 className="text-[clamp(1.625rem,2.3vw,2.125rem)] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--ink-primary)]">
                Four disciplines, one production standard
              </h2>
              <p className="mt-3 text-[15px] leading-[1.62] text-[var(--ink-secondary)] sm:text-base">
                Switch tracks to inspect production frameworks, architectural
                deliverables, and verified systems shipped across each
                discipline.
              </p>
            </div>

            <CapabilityMatrix />
          </Reveal>
        </div>
      </section>

      {/* BAND 3: ASYMMETRIC SELECTED SHIPPED SYSTEMS SHOWCASE */}
      <section className="bg-[var(--bg-canvas)] py-20 lg:py-26">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-12 max-w-[60ch]">
              <h2 className="text-[clamp(1.625rem,2.3vw,2.125rem)] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--ink-primary)]">
                Selected shipped systems
              </h2>
              <p className="mt-3 text-[15px] leading-[1.62] text-[var(--ink-secondary)] sm:text-base">
                Production architectures spanning digital freight dispatch,
                multi-agent governance, digital asset wealth, and quantitative
                risk modeling.{" "}
                <Link
                  href="/work"
                  className="group inline-flex items-center gap-1 whitespace-nowrap font-medium text-[var(--accent-deep)] underline decoration-[var(--accent-border)] transition-colors duration-150 hover:text-[var(--accent)] hover:decoration-[var(--accent)]"
                >
                  View all {PROJECTS.length} dossiers
                  <ArrowRight
                    size={14}
                    weight="bold"
                    className="hover-nudge-x shrink-0"
                    aria-hidden="true"
                  />
                </Link>
              </p>
            </div>
          </Reveal>

          <div className="space-y-6 lg:space-y-8">
            {/* Row 1: Flagship Full-Width Lead Feature (5/7 Horizontal Split) */}
            <Reveal>
              <article className="surface-elevated card-hover rounded-[var(--radius-md)] p-6 sm:p-8">
                <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
                  <div className="flex min-w-0 flex-col justify-between lg:col-span-5">
                    <div>
                      <ProjectCardMetadata project={leadProject} />

                      <h3 className="mt-4 text-[22px] font-semibold leading-[1.22] tracking-[-0.02em] text-[var(--ink-primary)] sm:text-2xl">
                        <Link
                          href={`/work/${leadProject.slug}`}
                          className="transition-colors duration-150 hover:text-[var(--accent-deep)]"
                        >
                          {leadProject.title}
                        </Link>
                      </h3>

                      <p className="mt-2.5 text-[15px] leading-[1.6] text-[var(--ink-secondary)]">
                        {leadProject.summary}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-1.5">
                        {leadProject.stack.slice(0, 4).map((tech) => (
                          <span
                            key={tech}
                            className="rounded-[var(--radius-xs)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-secondary)]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-[var(--border-hairline)] pt-5">
                      <Link
                        href={`/work/${leadProject.slug}`}
                        className="btn-press group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-deep)] hover:text-[var(--accent)]"
                      >
                        Inspect Dossier
                        <ArrowRight
                          size={14}
                          weight="bold"
                          className="hover-nudge-x shrink-0"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </div>

                  <div className="min-w-0 lg:col-span-7">
                    <ProjectSchematic
                      type={leadProject.schematicType}
                      compact
                    />
                  </div>
                </div>
              </article>
            </Reveal>

            {/* Row 2: Mid Asymmetric 2-Col Pair (Fortress & Institutional Crypto Wealth) */}
            <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
              {pairProjects.map((project, idx) => (
                <Reveal key={project.slug} delay={idx * 0.05} className="h-full">
                  <article className="surface-elevated card-hover flex h-full flex-col justify-between rounded-[var(--radius-md)] p-6 sm:p-7">
                    <div className="min-w-0">
                      <ProjectCardMetadata project={project} />

                      <h3 className="mt-4 text-xl font-semibold leading-[1.25] tracking-[-0.015em] text-[var(--ink-primary)]">
                        <Link
                          href={`/work/${project.slug}`}
                          className="transition-colors duration-150 hover:text-[var(--accent-deep)]"
                        >
                          {project.title}
                        </Link>
                      </h3>

                      <p className="mt-2.5 text-[15px] leading-[1.6] text-[var(--ink-secondary)]">
                        {project.summary}
                      </p>

                      <div className="mt-6">
                        <ProjectSchematic
                          type={project.schematicType}
                          compact
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-5">
                      <div className="flex flex-wrap gap-1.5">
                        {project.stack.slice(0, 4).map((tech) => (
                          <span
                            key={tech}
                            className="rounded-[var(--radius-xs)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-secondary)]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>

                      <Link
                        href={`/work/${project.slug}`}
                        className="btn-press group inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-[var(--accent-deep)] hover:text-[var(--accent)]"
                      >
                        Inspect Dossier
                        <ArrowRight
                          size={14}
                          weight="bold"
                          className="hover-nudge-x shrink-0"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>

            {/* Row 3: Wide Horizontal Quant Feature (5/7 Split for Monte Carlo Breadth) */}
            <Reveal>
              <article className="surface-elevated card-hover rounded-[var(--radius-md)] p-6 sm:p-8">
                <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
                  <div className="flex min-w-0 flex-col justify-between lg:col-span-5">
                    <div>
                      <ProjectCardMetadata project={quantProject} />

                      <h3 className="mt-4 text-[22px] font-semibold leading-[1.22] tracking-[-0.02em] text-[var(--ink-primary)] sm:text-2xl">
                        <Link
                          href={`/work/${quantProject.slug}`}
                          className="transition-colors duration-150 hover:text-[var(--accent-deep)]"
                        >
                          {quantProject.title}
                        </Link>
                      </h3>

                      <p className="mt-2.5 text-[15px] leading-[1.6] text-[var(--ink-secondary)]">
                        {quantProject.summary}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-1.5">
                        {quantProject.stack.slice(0, 4).map((tech) => (
                          <span
                            key={tech}
                            className="rounded-[var(--radius-xs)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-secondary)]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-[var(--border-hairline)] pt-5">
                      <Link
                        href={`/work/${quantProject.slug}`}
                        className="btn-press group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-deep)] hover:text-[var(--accent)]"
                      >
                        Inspect Dossier
                        <ArrowRight
                          size={14}
                          weight="bold"
                          className="hover-nudge-x shrink-0"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </div>

                  <div className="min-w-0 lg:col-span-7">
                    <ProjectSchematic
                      type={quantProject.schematicType}
                      compact
                    />
                  </div>
                </div>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* BAND 4: OPEN EDITORIAL EMPIRICAL EDGE + HAIRLINE COHORT LEDGER */}
      <section className="border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] py-20 lg:py-26">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
              {/* Left 7 Cols: Open Empirical Edge Narrative + Studio Photography */}
              <div className="min-w-0 lg:col-span-7">
                <h2 className="text-[clamp(1.625rem,2.3vw,2.125rem)] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--ink-primary)]">
                  Empirical rigor from the clinical bench to production
                </h2>

                <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.65] text-[var(--ink-secondary)] sm:text-base">
                  {PROFILE.empiricalEdge}
                </p>

                <div className="mt-8 overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-canvas)] shadow-[var(--shadow-surface)]">
                  <Image
                    src="/images/clinical-bench.jpg"
                    alt="Borosilicate laboratory glassware and machined stainless calibration weights on cool alabaster"
                    width={1376}
                    height={768}
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    className="block h-auto w-full object-cover"
                  />
                </div>

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div className="border-t border-[var(--border-hairline)] pt-4">
                    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                      Studio Venture
                    </p>
                    <p className="mt-1.5 text-[15px] font-semibold tabular-nums text-[var(--ink-primary)]">
                      {PROFILE.studio.name} · {PROFILE.studio.period}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                      Full-stack SaaS, autonomous multi-agent AI, and
                      quantitative infrastructure delivery.
                    </p>
                  </div>

                  <div className="border-t border-[var(--border-hairline)] pt-4">
                    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                      Frontier RLHF
                    </p>
                    <p className="mt-1.5 text-[15px] font-semibold text-[var(--ink-primary)]">
                      Outlier.ai &amp; OneForma
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                      Evaluating frontier model reasoning across TypeScript,
                      Python, quant math, and clinical diagnostics.
                    </p>
                  </div>
                </div>

                <div className="mt-7">
                  <Link
                    href="/experience"
                    className="btn-press group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-deep)] hover:text-[var(--accent)]"
                  >
                    Read Full Experience &amp; Credentials
                    <ArrowRight
                      size={14}
                      weight="bold"
                      className="hover-nudge-x shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>

              {/* Right 5 Cols: Unboxed Hairline Cohort Ledger */}
              <div className="min-w-0 lg:col-span-5 lg:border-l lg:border-[var(--border-hairline)] lg:pl-10">
                <h2 className="text-xl font-semibold leading-[1.25] tracking-[-0.015em] text-[var(--ink-primary)] sm:text-[22px]">
                  2026 Hackathons &amp; Cohorts
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
                  Selected builder programs and agentic engineering
                  competitions.
                </p>

                <ul className="mt-6 divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]">
                  {HACKATHONS_AND_PROGRAMS.map((item) => (
                    <li key={item.name} className="py-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[15px] font-semibold leading-snug text-[var(--ink-primary)]">
                          {item.name}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] font-medium tabular-nums text-[var(--ink-muted)]">
                          {item.year}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-[var(--accent-deep)]">
                        {item.organizer}
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-secondary)]">
                        {item.focus}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* BAND 5: OPEN CLOSING CONVERSION BAND */}
      <section className="border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)] py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
              <div className="max-w-[56ch]">
                <h2 className="text-[clamp(1.625rem,2.3vw,2.125rem)] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--ink-primary)]">
                  Have a production system to ship?
                </h2>
                <p className="mt-3 text-[15px] leading-[1.62] text-[var(--ink-secondary)] sm:text-base">
                  Available worldwide ({PROFILE.utcOffsetLabel}) for remote
                  freelance contracts, SaaS platforms, multi-agent AI
                  architecture, quantitative tooling, and HealthTech engineering
                  advisory.
                </p>
              </div>

              <ClosingCtaButtons />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
