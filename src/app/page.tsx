import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PROFILE } from "@/data/profile";
import { PROJECTS, type ProjectDossier } from "@/data/projects";
import { HACKATHONS_AND_PROGRAMS } from "@/data/experience";
import { HeroLineReveal, Reveal } from "@/components/ui/MotionPrimitives";
import { CapabilityMatrix } from "@/components/home/CapabilityMatrix";
import { ProjectSchematic } from "@/components/schematics/ProjectSchematic";

export default function HomePage() {
  const koridorProject =
    PROJECTS.find((p) => p.slug === "koridor-engine-os") ?? PROJECTS[0];
  const fortressProject =
    PROJECTS.find((p) => p.slug === "fortress-fleet-ai") ?? PROJECTS[1];
  const wealthProject =
    PROJECTS.find((p) => p.slug === "institutional-crypto-wealth") ??
    PROJECTS[2];
  const quantProject: ProjectDossier =
    PROJECTS.find((p) => p.slug === "quant-forex-crypto-hft") ?? PROJECTS[4];

  return (
    <div>
      {/* BAND 1: FULL-BLEED DEEP MARINE OPTICAL TAKEOVER (bleeds to y = 0) */}
      <section className="relative flex min-h-[100dvh] items-end overflow-hidden bg-[var(--bg-marine)] text-[var(--ink-on-marine)]">
        <Image
          src="/images/hero-marine-prism.jpg"
          alt="Faceted borosilicate optical prisms and dark brushed titanium calibration blocks refracting cerulean light on matte marine slate"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[76%_50%] lg:object-[88%_50%]"
        />

        {/* Subtle directional legibility wash preserving prism brilliance */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07111A]/88 via-[#07111A]/52 to-transparent lg:from-[#07111A]/70 lg:via-[#07111A]/20 lg:to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#07111A]/80 to-transparent"
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pt-32 pb-16 sm:px-8 sm:pb-24 lg:px-10 lg:pb-28">
          <div className="max-w-3xl">
            <HeroLineReveal
              lines={["Systems built with", "clinical precision"]}
              className="type-hero text-[var(--ink-on-marine)]"
            />

            <p className="type-body mt-7 max-w-[48ch] text-[var(--ink-on-marine-secondary)]">
              Akaolisa Enwedo leads OXAKALABS, building Next.js SaaS platforms,
              multi-agent AI, and quantitative risk engines grounded in licensed
              biomedical science.
            </p>

            <div className="mt-9">
              <Link
                href="/work"
                className="btn-press group type-body inline-flex items-center gap-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] px-6 py-3.5 font-medium text-[var(--ink-on-marine)] hover:bg-[#1D64EB]"
              >
                <span>Explore shipped systems</span>
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="hover-nudge-x shrink-0"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BAND 2: INTERACTIVE DISCIPLINE WORKBENCH (GALLERY WHITE) */}
      <section className="border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <div className="mb-12 max-w-[60ch]">
              <h2 className="type-heading text-[var(--ink-primary)]">
                Four disciplines under one engineering standard
              </h2>
              <p className="type-body mt-4 text-[var(--ink-secondary)]">
                Switch tracks to examine production deliverables, core
                technologies, and deployed systems across each domain.
              </p>
            </div>

            <CapabilityMatrix />
          </Reveal>
        </div>
      </section>

      {/* BAND 3: FLAGSHIP FULL-WIDTH ARCHITECTURAL STAGE (KORIDOR ENGINE OS) */}
      <section className="bg-[var(--bg-canvas)] py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <div className="mb-14 flex flex-col justify-between gap-6 border-b border-[var(--border-hairline)] pb-10 lg:flex-row lg:items-end">
              <div className="max-w-[58ch]">
                <h2 className="type-heading text-[var(--ink-primary)]">
                  Production systems in the field
                </h2>
                <p className="type-body mt-4 text-[var(--ink-secondary)]">
                  Software architectures operating across digital freight
                  dispatch, autonomous agent governance, digital asset wealth,
                  and quantitative trading.
                </p>
              </div>

              <Link
                href="/work"
                className="type-body group inline-flex shrink-0 items-center gap-1.5 font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
              >
                <span>Browse all {PROJECTS.length} technical dossiers</span>
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="hover-nudge-x shrink-0"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Reveal>

          {/* Koridor Engine OS Open Editorial Stage */}
          <Reveal>
            <article className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="min-w-0 lg:col-span-5">
                <p className="type-sm tabular-nums text-[var(--ink-muted)]">
                  {koridorProject.clientDomain} · {koridorProject.year}
                </p>

                <h3 className="type-heading mt-3 text-[var(--ink-primary)]">
                  <Link
                    href={`/work/${koridorProject.slug}`}
                    className="transition-colors duration-150 hover:text-[var(--accent-deep)]"
                  >
                    {koridorProject.title}
                  </Link>
                </h3>

                <p className="type-body mt-4 max-w-[54ch] text-[var(--ink-secondary)]">
                  {koridorProject.summary}
                </p>

                <p className="type-sm mt-5 text-[var(--ink-muted)]">
                  {koridorProject.stack.slice(0, 5).join(" · ")}
                </p>

                <div className="mt-7">
                  <Link
                    href={`/work/${koridorProject.slug}`}
                    className="type-body group inline-flex items-center gap-1.5 font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
                  >
                    <span>Inspect Koridor dossier</span>
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className="hover-nudge-x shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>

              <div className="min-w-0 lg:col-span-7">
                <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                  <ProjectSchematic type={koridorProject.schematicType} />
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* BAND 4: FULL-BLEED DEEP MARINE INTERLUDE (FORTRESS FLEET AI) */}
      <section className="bg-[var(--bg-marine)] py-24 text-[var(--ink-on-marine)] lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <article className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="min-w-0 lg:col-span-5">
                <p className="type-sm tabular-nums text-[var(--ink-on-marine-muted)]">
                  {fortressProject.clientDomain} · {fortressProject.year}
                </p>

                <h2 className="type-heading mt-3 text-[var(--ink-on-marine)]">
                  <Link
                    href={`/work/${fortressProject.slug}`}
                    className="transition-colors duration-150 hover:text-[var(--accent-bright)]"
                  >
                    {fortressProject.title}
                  </Link>
                </h2>

                <p className="type-body mt-4 max-w-[54ch] text-[var(--ink-on-marine-secondary)]">
                  {fortressProject.summary}
                </p>

                <p className="type-sm mt-5 text-[var(--ink-on-marine-muted)]">
                  {fortressProject.stack.slice(0, 5).join(" · ")}
                </p>

                <div className="mt-7">
                  <Link
                    href={`/work/${fortressProject.slug}`}
                    className="type-body group inline-flex items-center gap-1.5 font-medium text-[var(--accent-bright)] transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
                  >
                    <span>Inspect Fortress architecture</span>
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className="hover-nudge-x shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>

              <div className="min-w-0 lg:col-span-7">
                <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-on-marine)] bg-[var(--bg-marine-elevated)]">
                  <ProjectSchematic
                    type={fortressProject.schematicType}
                    theme="marine"
                  />
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* BAND 5: QUANTITATIVE RISK & WEALTH ASYMMETRIC STAGE (COOL STONE) */}
      <section className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)] py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
              {/* Left 7 Cols: Interactive Monte Carlo Quant Suite */}
              <article className="min-w-0 lg:col-span-7">
                <p className="type-sm tabular-nums text-[var(--ink-muted)]">
                  {quantProject.clientDomain} · {quantProject.year}
                </p>

                <h2 className="type-heading mt-2.5 text-[var(--ink-primary)]">
                  <Link
                    href={`/work/${quantProject.slug}`}
                    className="transition-colors duration-150 hover:text-[var(--accent-deep)]"
                  >
                    {quantProject.title}
                  </Link>
                </h2>

                <p className="type-body mt-3.5 max-w-[60ch] text-[var(--ink-secondary)]">
                  {quantProject.summary}
                </p>

                <div className="mt-7 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                  <ProjectSchematic type={quantProject.schematicType} />
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="type-sm text-[var(--ink-muted)]">
                    {quantProject.stack.slice(0, 4).join(" · ")}
                  </p>
                  <Link
                    href={`/work/${quantProject.slug}`}
                    className="type-body group inline-flex items-center gap-1.5 font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
                  >
                    <span>Open risk dossier</span>
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className="hover-nudge-x shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </article>

              {/* Right 5 Cols: Institutional Crypto & Wealth Platform */}
              <article className="flex min-w-0 flex-col justify-between border-t border-[var(--border-hairline)] pt-10 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
                <div>
                  <p className="type-sm tabular-nums text-[var(--ink-muted)]">
                    {wealthProject.clientDomain} · {wealthProject.year}
                  </p>

                  <h3 className="type-heading mt-2.5 text-[var(--ink-primary)]">
                    <Link
                      href={`/work/${wealthProject.slug}`}
                      className="transition-colors duration-150 hover:text-[var(--accent-deep)]"
                    >
                      {wealthProject.title}
                    </Link>
                  </h3>

                  <p className="type-body mt-3.5 text-[var(--ink-secondary)]">
                    {wealthProject.summary}
                  </p>

                  <div className="mt-7 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                    <ProjectSchematic
                      type={wealthProject.schematicType}
                      compact
                    />
                  </div>
                </div>

                <div className="mt-7 border-t border-[var(--border-hairline)] pt-5">
                  <p className="type-sm text-[var(--ink-muted)]">
                    {wealthProject.stack.slice(0, 4).join(" · ")}
                  </p>
                  <Link
                    href={`/work/${wealthProject.slug}`}
                    className="type-body group mt-3 inline-flex items-center gap-1.5 font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
                  >
                    <span>Inspect wealth architecture</span>
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className="hover-nudge-x shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </article>
            </div>
          </Reveal>
        </div>
      </section>

      {/* BAND 6: EMPIRICAL RIGOR FROM CLINICAL BENCH TO PRODUCTION */}
      <section className="bg-[var(--bg-surface)] py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
              {/* Left 6 Cols: Art-Directed Clinical Optics Visual + Credential Ledger */}
              <div className="min-w-0 lg:col-span-6">
                <h2 className="type-heading text-[var(--ink-primary)]">
                  Clinical chemistry rigor applied to software
                </h2>

                <p className="type-body mt-4 max-w-[60ch] text-[var(--ink-secondary)]">
                  {PROFILE.empiricalEdge}
                </p>

                <div className="mt-8 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                  <Image
                    src="/images/clinical-optics.jpg"
                    alt="Clear borosilicate volumetric flask, quartz optical prism, and graduated stainless steel calibration weights on pale porcelain"
                    width={1376}
                    height={917}
                    sizes="(min-width: 1024px) 46vw, 100vw"
                    className="block h-auto w-full object-cover"
                  />
                </div>

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div className="border-t border-[var(--border-hairline)] pt-4">
                    <h3 className="type-subhead tabular-nums text-[var(--ink-primary)]">
                      {PROFILE.studio.name} ({PROFILE.studio.period})
                    </h3>
                    <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                      Independent studio shipping full-stack SaaS, multi-agent
                      governance, and quantitative trading tooling worldwide.
                    </p>
                  </div>

                  <div className="border-t border-[var(--border-hairline)] pt-4">
                    <h3 className="type-subhead text-[var(--ink-primary)]">
                      Outlier.ai and OneForma
                    </h3>
                    <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                      Benchmarking frontier model reasoning across TypeScript,
                      Python, quantitative mathematics, and clinical analysis.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right 6 Cols: Hairline-Ruled 2026 Cohorts & Experience Ledger */}
              <div className="flex min-w-0 flex-col justify-between lg:col-span-6 lg:border-l lg:border-[var(--border-hairline)] lg:pl-12">
                <div>
                  <h2 className="type-heading text-[var(--ink-primary)]">
                    Selected 2026 cohorts and hackathons
                  </h2>
                  <p className="type-body mt-4 max-w-[54ch] text-[var(--ink-secondary)]">
                    Recent competitive engineering builds, early access studio
                    programs, and agentic systems cohorts.
                  </p>

                  <ul className="mt-8 divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]">
                    {HACKATHONS_AND_PROGRAMS.map((item) => (
                      <li key={item.name} className="py-5">
                        <div className="flex items-baseline justify-between gap-4">
                          <h3 className="type-subhead text-[var(--ink-primary)]">
                            {item.name}
                          </h3>
                          <span className="type-sm shrink-0 tabular-nums text-[var(--ink-muted)]">
                            {item.year}
                          </span>
                        </div>
                        <p className="type-sm mt-1 font-medium text-[var(--accent-deep)]">
                          {item.organizer}
                        </p>
                        <p className="type-body mt-1.5 text-[var(--ink-secondary)]">
                          {item.focus}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Link
                    href="/experience"
                    className="type-body group inline-flex items-center gap-1.5 font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
                  >
                    <span>Read full career timeline and clinical credentials</span>
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className="hover-nudge-x shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* BAND 7: FULL-BLEED DEEP MARINE CLOSING CONVERSION STAGE */}
      <section className="relative overflow-hidden bg-[var(--bg-marine)] py-24 text-[var(--ink-on-marine)] lg:py-28">
        <Image
          src="/images/studio-atelier.jpg"
          alt="Fluted optical borosilicate glass columns and dark anodized titanium lit by cerulean cobalt rim light"
          fill
          sizes="100vw"
          className="object-cover object-right opacity-85"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07111A] via-[#07111A]/85 to-transparent"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <div className="max-w-2xl">
              <h2 className="type-heading text-[var(--ink-on-marine)]">
                Ready to ship your next production system
              </h2>
              <p className="type-body mt-4 max-w-[54ch] text-[var(--ink-on-marine-secondary)]">
                Available remotely worldwide from {PROFILE.utcOffsetLabel} for
                full-stack SaaS architecture, autonomous multi-agent systems,
                quantitative trading tooling, and HealthTech engineering
                advisory.
              </p>

              <div className="mt-8">
                <Link
                  href="/contact"
                  className="btn-press group type-body inline-flex items-center gap-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] px-6 py-3.5 font-medium text-[var(--ink-on-marine)] hover:bg-[#1D64EB]"
                >
                  <span>Start a project</span>
                  <ArrowRight
                    size={16}
                    weight="bold"
                    className="hover-nudge-x shrink-0"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
