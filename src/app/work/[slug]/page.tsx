import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
} from "@phosphor-icons/react/dist/ssr";
import { getProjectBySlug, PROJECTS } from "@/data/projects";
import { ProjectSchematic } from "@/components/schematics/ProjectSchematic";
import { ScrollProgressRail } from "@/components/ui/MotionPrimitives";
import { buildPageMetadata } from "@/lib/site";

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

  return buildPageMetadata({
    title: `${project.title}: Case Study`,
    description: project.summary,
    path: `/work/${project.slug}`,
  });
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

      <article className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <div className="mb-8">
          <Link
            href="/work"
            className="type-sm group inline-flex items-center gap-1.5 font-medium text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--ink-primary)]"
          >
            <ArrowLeft
              size={15}
              weight="bold"
              className="hover-nudge-x-neg shrink-0"
              aria-hidden="true"
            />
            <span>All systems</span>
          </Link>
        </div>

        {/* Monograph Header */}
        <header className="border-b border-[var(--border-hairline)] pb-10">
          <h1 className="type-page-title text-[var(--ink-primary)]">
            {project.title}
          </h1>

          <p className="type-body mt-4 max-w-[64ch] font-medium text-[var(--ink-primary)]">
            {project.subtitle}
          </p>

          <p className="type-meta mt-3 text-[var(--ink-muted)]">
            {project.clientDomain} · {project.year} · {project.statusBadge}
            {project.isNda ? " · Client confidentiality preserved" : ""}
          </p>

          <p className="type-body mt-5 max-w-[65ch] text-[var(--ink-secondary)]">
            {project.summary}
          </p>
        </header>

        {/* Full Interactive System Architecture Schematic */}
        <section
          aria-label="Interactive system architecture schematic"
          className="my-12"
        >
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="type-subhead text-[var(--ink-primary)]">
              Interactive architecture schematic
            </h2>
            <p className="type-meta text-[var(--ink-muted)]">
              Inspect nodes, switch timeframes, or scrub parameters directly
            </p>
          </div>
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <ProjectSchematic type={project.schematicType} />
          </div>
        </section>

        {/* Reading Column & Sticky Technical Specification Rail */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="space-y-12 lg:col-span-8">
            <section>
              <h2 className="type-heading text-[var(--ink-primary)]">
                System context and problem
              </h2>
              <p className="type-body mt-4 max-w-[65ch] text-[var(--ink-secondary)]">
                {project.challenge}
              </p>
            </section>

            <section className="border-t border-[var(--border-hairline)] pt-10">
              <h2 className="type-heading text-[var(--ink-primary)]">
                Architectural blueprint
              </h2>
              <ul className="mt-5 space-y-4">
                {project.architectureDecisions.map((item) => (
                  <li
                    key={item}
                    className="type-body flex max-w-[65ch] items-start gap-3 text-[var(--ink-primary)]"
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
            </section>

            <section className="border-t border-[var(--border-hairline)] pt-10">
              <h2 className="type-heading text-[var(--ink-primary)]">
                Technical execution highlights
              </h2>
              <ul className="mt-5 divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]">
                {project.executionHighlights.map((item) => (
                  <li
                    key={item}
                    className="type-body max-w-[65ch] py-4 text-[var(--ink-secondary)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="border-t border-[var(--border-hairline)] pt-10">
              <h2 className="type-heading text-[var(--ink-primary)]">
                Operational and business impact
              </h2>
              <ul className="mt-5 space-y-3.5">
                {project.businessImpact.map((item) => (
                  <li
                    key={item}
                    className="type-body flex max-w-[65ch] items-start gap-3 text-[var(--ink-primary)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Sticky Technical Specification Rail */}
          <aside className="lg:sticky lg:top-24 lg:col-span-4 lg:self-start lg:border-l lg:border-[var(--border-hairline)] lg:pl-10">
            <div>
              <h3 className="type-kicker text-[var(--ink-muted)]">
                Production stack
              </h3>
              <p className="type-meta mt-3 leading-relaxed text-[var(--ink-secondary)]">
                {project.stack.join(" · ")}
              </p>
            </div>

            {project.links.length > 0 && (
              <div className="mt-8 border-t border-[var(--border-hairline)] pt-6">
                <h3 className="type-kicker text-[var(--ink-muted)]">
                  Deployments and references
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {project.links.map((ext) => (
                    <li key={ext.href}>
                      <a
                        href={ext.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="type-sm group inline-flex items-center gap-1.5 font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
                      >
                        <span>{ext.label}</span>
                        <ArrowUpRight
                          size={14}
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

            <div className="mt-8 border-t border-[var(--border-hairline)] pt-6">
              <p className="type-sm text-[var(--ink-secondary)]">
                Planning a system with similar reliability, real-time telemetry,
                or agentic governance requirements?
              </p>
              <Link
                href={`/contact?track=${project.primaryTrack}`}
                className="btn-press group type-sm mt-5 flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-5 py-3 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)]"
              >
                <span>Start a similar project</span>
                <ArrowRight
                  size={15}
                  weight="bold"
                  className="hover-nudge-x shrink-0"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </aside>
        </div>

        {/* Hairline Case Study Pagination */}
        <nav
          aria-label="Case study pagination"
          className="mt-16 grid gap-8 border-t border-[var(--border-hairline)] pt-10 sm:grid-cols-2"
        >
          <Link
            href={`/work/${prevProject.slug}`}
            className="group block py-2"
          >
            <span className="type-kicker inline-flex items-center gap-1.5 text-[var(--ink-muted)]">
              <ArrowLeft
                size={13}
                weight="bold"
                className="hover-nudge-x-neg shrink-0"
                aria-hidden="true"
              />
              <span>Previous dossier</span>
            </span>
            <span className="type-subhead mt-2 block text-[var(--ink-primary)] transition-colors duration-150 group-hover:text-[var(--accent-deep)]">
              {prevProject.title}
            </span>
          </Link>

          <Link
            href={`/work/${nextProject.slug}`}
            className="group block py-2 sm:text-right"
          >
            <span className="type-kicker inline-flex items-center gap-1.5 text-[var(--ink-muted)]">
              <span>Next dossier</span>
              <ArrowRight
                size={13}
                weight="bold"
                className="hover-nudge-x shrink-0"
                aria-hidden="true"
              />
            </span>
            <span className="type-subhead mt-2 block text-[var(--ink-primary)] transition-colors duration-150 group-hover:text-[var(--accent-deep)]">
              {nextProject.title}
            </span>
          </Link>
        </nav>
      </article>
    </>
  );
}
