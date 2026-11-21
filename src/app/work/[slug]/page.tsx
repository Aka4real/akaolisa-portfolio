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
    title: `${project.title} — Case Study (${project.indexCode})`,
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
    <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-18 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/work"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-[#4B4E54] hover:text-[#111214]"
        >
          <ArrowLeft size={14} weight="bold" />
          Back to All Systems
        </Link>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-[#6E727A]">{project.indexCode}</span>
          <span className="text-[#D1CDC4]">/</span>
          <span className="text-[#0F3D91]">{project.year}</span>
        </div>
      </div>

      {/* Header Dossier Block */}
      <header className="border-b border-[#E5E2DC] pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-[#BFDBFE] bg-[#EFF4FF] px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[#0F3D91]">
            {project.statusBadge}
          </span>
          <span className="font-mono text-xs text-[#6E727A]">
            {project.clientDomain}
          </span>
          {project.isNda && (
            <span className="inline-flex items-center gap-1 rounded border border-[#E5E2DC] bg-white px-2 py-0.5 font-mono text-[10.5px] text-[#4B4E54]">
              <LockSimple size={11} weight="bold" />
              Client Confidentiality Preserved
            </span>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#111214] sm:text-4xl lg:text-[42px] lg:leading-[1.12]">
          {project.title}
        </h1>
        <p className="mt-2 font-serif text-xl italic text-[#4B4E54]">
          {project.subtitle}
        </p>

        <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#4B4E54]">
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
                className="btn-press inline-flex items-center gap-1.5 rounded border border-[#E5E2DC] bg-white px-3.5 py-2 font-mono text-xs font-medium text-[#111214] hover:border-[#1D4ED8] hover:text-[#0F3D91]"
              >
                {ext.label}
                <ArrowUpRight size={13} weight="bold" />
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Interactive Technical Schematic Workbench */}
      <section className="my-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
            Interactive System Architecture Schematic
          </h2>
          <span className="font-mono text-[10.5px] text-[#6E727A]">
            Click nodes or parameters to inspect
          </span>
        </div>
        <ProjectSchematic type={project.schematicType} />
      </section>

      {/* Dossier Body */}
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          <section>
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
              01 / System Context &amp; Problem
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#4B4E54] sm:text-[15px]">
              {project.challenge}
            </p>
          </section>

          <section className="border-t border-[#E5E2DC] pt-8">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
              02 / Architectural Blueprint
            </h2>
            <ul className="mt-4 space-y-3">
              {project.architectureDecisions.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-[#111214]"
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
          </section>

          <section className="border-t border-[#E5E2DC] pt-8">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
              03 / Technical Execution Highlights
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {project.executionHighlights.map((item, idx) => (
                <div
                  key={item}
                  className="rounded border border-[#E5E2DC] bg-white p-4"
                >
                  <div className="font-mono text-[10px] font-semibold text-[#6E727A]">
                    EXEC 0{idx + 1}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#111214]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-[#E5E2DC] pt-8">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
              04 / Operational &amp; Business Impact
            </h2>
            <ul className="mt-4 space-y-2.5">
              {project.businessImpact.map((item) => (
                <li
                  key={item}
                  className="border-l-2 border-[#1D4ED8] pl-3.5 text-sm leading-relaxed text-[#4B4E54]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right Sticky Spec Sidebar */}
        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-lg border border-[#E5E2DC] bg-white p-5">
            <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-widest text-[#6E727A]">
              Production Stack
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded border border-[#E5E2DC] bg-[#FAF9F6] px-2.5 py-1 font-mono text-[11px] text-[#111214]"
                >
                  {tech}
                </span>
              ))}
            </div>

            <div className="mt-6 border-t border-[#E5E2DC] pt-5">
              <p className="text-xs leading-relaxed text-[#4B4E54]">
                Planning an architecture with similar reliability, real-time
                telemetry, or agentic governance requirements?
              </p>
              <Link
                href={`/contact?track=${project.primaryTrack}`}
                className="btn-press mt-4 flex w-full items-center justify-center gap-1.5 rounded bg-[#111214] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#1D4ED8]"
              >
                Build a Similar System
                <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Next / Previous Navigation Rail */}
      <nav
        aria-label="Case study pagination"
        className="mt-14 grid gap-4 border-t border-[#E5E2DC] pt-8 sm:grid-cols-2"
      >
        <Link
          href={`/work/${prevProject.slug}`}
          className="card-hover rounded-lg border border-[#E5E2DC] bg-white p-4"
        >
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#6E727A]">
            <ArrowLeft size={12} weight="bold" />
            Previous Dossier · {prevProject.indexCode}
          </span>
          <span className="mt-1 block text-sm font-semibold text-[#111214]">
            {prevProject.title}
          </span>
        </Link>

        <Link
          href={`/work/${nextProject.slug}`}
          className="card-hover rounded-lg border border-[#E5E2DC] bg-white p-4 sm:text-right"
        >
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#6E727A]">
            Next Dossier · {nextProject.indexCode}
            <ArrowRight size={12} weight="bold" />
          </span>
          <span className="mt-1 block text-sm font-semibold text-[#111214]">
            {nextProject.title}
          </span>
        </Link>
      </nav>
    </article>
  );
}
