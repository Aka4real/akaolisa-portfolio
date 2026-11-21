import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  LockSimple,
} from "@phosphor-icons/react/dist/ssr";
import { getProjectBySlug, PROJECTS } from "@/data/projects";
import { ProjectSchematic } from "@/components/schematics/ProjectSchematic";
import { ScrollProgressRail } from "@/components/ui/MotionPrimitives";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return { title: "Case Study Not Found" };

  return {
    title: `${project.title}: Case Study (${project.indexCode})`,
    description: project.summary,
  };
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const currentIndex = PROJECTS.findIndex((p) => p.slug === project.slug);
  const prevProject =
    currentIndex > 0 ? PROJECTS[currentIndex - 1] : PROJECTS[PROJECTS.length - 1];
  const nextProject =
    currentIndex < PROJECTS.length - 1 ? PROJECTS[currentIndex + 1] : PROJECTS[0];

  return (
    <>
      <ScrollProgressRail />

      <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-18 lg:px-8">
        {/* Top Breadcrumb & Index Strip */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/work"
            className="btn-press group inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] py-1 pr-2 text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            <ArrowLeft
              size={14}
              weight="bold"
              className="hover-nudge-x-neg shrink-0"
              aria-hidden="true"
            />
            <span>All Systems</span>
          </Link>

          <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
            <span className="font-semibold text-[var(--ink-secondary)]">
              {project.indexCode}
            </span>
            <span aria-hidden="true" className="text-[var(--border-strong)]">
              ·
            </span>
            <span className="text-[var(--accent-deep)]">{project.year}</span>
          </div>
        </div>

        {/* Dossier Header */}
        <header className="border-b border-[var(--border-hairline)] pb-9">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 py-1 font-mono text-[11px] font-medium ${
                project.isNda
                  ? "bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
                  : "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
              }`}
            >
              {project.isNda && (
                <LockSimple size={11} weight="bold" aria-hidden="true" />
              )}
              {project.statusBadge}
            </span>

            <span className="text-xs font-medium text-[var(--ink-muted)]">
              {project.clientDomain}
            </span>

            {project.isNda && (
              <span className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-secondary)]">
                Client Confidentiality Preserved
              </span>
            )}
          </div>

          <h1 className="mt-4 text-[clamp(2rem,3.4vw,2.875rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--ink-primary)]">
            {project.title}
          </h1>

          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[var(--ink-secondary)] sm:text-[19px]">
            {project.subtitle}
          </p>

          <p className="mt-5 max-w-[65ch] text-base leading-[1.65] text-[var(--ink-secondary)]">
            {project.summary}
          </p>

          {project.links.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              {project.links.map((ext) => (
                <a
                  key={ext.href}
                  href={ext.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press group inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-deep)]"
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
        </header>

        {/* Elevated Interactive Architecture Schematic */}
        <section aria-label="Interactive System Architecture Schematic" className="my-11">
          <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-[var(--ink-primary)]">
              Interactive System Architecture Schematic
            </h2>
            <span className="font-mono text-[11px] text-[var(--ink-muted)]">
              Inspect nodes and parameters
            </span>
          </div>
          <div className="surface-elevated overflow-hidden rounded-[var(--radius-lg)]">
            <ProjectSchematic type={project.schematicType} />
          </div>
        </section>

        {/* Dossier Narrative & Sticky Stack Sidebar */}
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="space-y-12 lg:col-span-8">
            <section>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
                System Context &amp; Problem
              </h2>
              <p className="mt-3.5 max-w-[65ch] text-[15px] leading-[1.68] text-[var(--ink-secondary)] sm:text-base">
                {project.challenge}
              </p>
            </section>

            <section className="border-t border-[var(--border-hairline)] pt-9">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
                Architectural Blueprint
              </h2>
              <ul className="mt-5 space-y-3.5">
                {project.architectureDecisions.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[15px] leading-[1.62] text-[var(--ink-primary)]"
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
            </section>

            <section className="border-t border-[var(--border-hairline)] pt-9">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
                Technical Execution Highlights
              </h2>
              <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {project.executionHighlights.map((item, idx) => (
                  <div
                    key={item}
                    className="border-t border-[var(--border-hairline)] pt-4"
                  >
                    <div className="font-mono text-[11px] font-semibold tabular-nums text-[var(--accent-deep)]">
                      EXEC 0{idx + 1}
                    </div>
                    <p className="mt-2 text-sm leading-[1.62] text-[var(--ink-secondary)]">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t border-[var(--border-hairline)] pt-9">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
                Operational &amp; Business Impact
              </h2>
              <ol className="mt-5 divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]">
                {project.businessImpact.map((item, idx) => (
                  <li
                    key={item}
                    className="grid gap-1.5 py-4 sm:grid-cols-12 sm:items-baseline sm:gap-4"
                  >
                    <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--accent-deep)] sm:col-span-3">
                      IMPACT 0{idx + 1}
                    </span>
                    <p className="text-[15px] leading-[1.62] text-[var(--ink-primary)] sm:col-span-9">
                      {item}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Sticky Production Stack & Links Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
            <div className="surface-elevated rounded-[var(--radius-md)] p-6">
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                Production Stack
              </h3>

              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {project.stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-[var(--radius-xs)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-primary)]"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {project.links.length > 0 && (
                <div className="mt-6 border-t border-[var(--border-hairline)] pt-5">
                  <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                    Deployments &amp; Links
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {project.links.map((ext) => (
                      <li key={ext.href}>
                        <a
                          href={ext.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
                        >
                          <span>{ext.label}</span>
                          <ArrowUpRight
                            size={13}
                            weight="bold"
                            className="hover-nudge-ne shrink-0"
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 border-t border-[var(--border-hairline)] pt-5">
                <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">
                  Planning a system with similar reliability, real-time
                  telemetry, or agentic governance requirements?
                </p>
                <Link
                  href={`/contact?track=${project.primaryTrack}`}
                  className="btn-press group mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-4 py-2.5 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)]"
                >
                  <span>Start a Project</span>
                  <ArrowRight
                    size={13}
                    weight="bold"
                    className="hover-nudge-x shrink-0"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Previous / Next Dossier Pagination */}
        <nav
          aria-label="Case study pagination"
          className="mt-16 grid gap-5 border-t border-[var(--border-hairline)] pt-10 sm:grid-cols-2"
        >
          <Link
            href={`/work/${prevProject.slug}`}
            className="surface-elevated card-hover btn-press group block rounded-[var(--radius-md)] p-5"
          >
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
              <ArrowLeft
                size={13}
                weight="bold"
                className="hover-nudge-x-neg shrink-0"
                aria-hidden="true"
              />
              <span>Previous Dossier · {prevProject.indexCode}</span>
            </span>
            <span className="mt-1.5 block text-base font-semibold tracking-[-0.015em] text-[var(--ink-primary)] transition-colors duration-150 group-hover:text-[var(--accent-deep)]">
              {prevProject.title}
            </span>
          </Link>

          <Link
            href={`/work/${nextProject.slug}`}
            className="surface-elevated card-hover btn-press group block rounded-[var(--radius-md)] p-5 sm:text-right"
          >
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
              <span>Next Dossier · {nextProject.indexCode}</span>
              <ArrowRight
                size={13}
                weight="bold"
                className="hover-nudge-x shrink-0"
                aria-hidden="true"
              />
            </span>
            <span className="mt-1.5 block text-base font-semibold tracking-[-0.015em] text-[var(--ink-primary)] transition-colors duration-150 group-hover:text-[var(--accent-deep)]">
              {nextProject.title}
            </span>
          </Link>
        </nav>
      </article>
    </>
  );
}
