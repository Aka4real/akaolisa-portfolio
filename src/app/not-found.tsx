import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[64vh] max-w-6xl flex-col items-start justify-center px-4 py-24 sm:px-6 lg:px-8">
      <div className="max-w-xl">
        <span className="inline-flex items-center rounded-[var(--radius-xs)] bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-xs font-medium tabular-nums text-[var(--accent-deep)]">
          404 · Route Not Found
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[var(--ink-primary)] sm:text-4xl">
          This dossier route does not exist.
        </h1>
        <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-[var(--ink-secondary)]">
          The page you requested may have moved or is not indexed on
          oxakalabs.xyz. Return to the flagship overview or explore all six
          shipped systems.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="btn-press group inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-4 py-2.5 text-sm font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)]"
          >
            <ArrowLeft
              size={15}
              weight="bold"
              className="hover-nudge-x-neg shrink-0"
              aria-hidden="true"
            />
            Return Home
          </Link>
          <Link
            href="/work"
            className="btn-press group inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-medium text-[var(--ink-primary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-deep)]"
          >
            View Selected Work
            <ArrowRight
              size={15}
              weight="bold"
              className="hover-nudge-x shrink-0"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
