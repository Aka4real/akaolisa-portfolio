import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[68vh] max-w-7xl flex-col items-start justify-center px-5 py-24 sm:px-8 lg:px-10">
      <div className="max-w-xl">
        <h1 className="type-page-title text-[var(--ink-primary)]">
          This route does not exist
        </h1>
        <p className="type-body mt-4 max-w-[54ch] text-[var(--ink-secondary)]">
          The page you requested may have moved or is not indexed on
          oxakalabs.xyz. Return to the overview or browse all six shipped
          systems.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link
            href="/"
            className="btn-press group type-sm inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-5 py-3 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)]"
          >
            <ArrowLeft
              size={15}
              weight="bold"
              className="hover-nudge-x-neg shrink-0"
              aria-hidden="true"
            />
            <span>Return home</span>
          </Link>
          <Link
            href="/work"
            className="type-sm font-medium text-[var(--accent-deep)] underline decoration-[var(--accent-border)] transition-colors duration-150 hover:text-[var(--accent)] hover:decoration-[var(--accent)]"
          >
            Browse selected work
          </Link>
        </div>
      </div>
    </section>
  );
}
