import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center px-4 py-20 sm:px-6">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#0F3D91]">
        HTTP 404 · Route Not Indexed
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#111214]">
        This dossier route does not exist.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#4B4E54]">
        Return to the flagship overview or explore all six shipped systems on
        the Work catalog.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/"
          className="btn-press inline-flex items-center gap-1.5 rounded bg-[#111214] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#1D4ED8]"
        >
          <ArrowLeft size={14} weight="bold" />
          Return Home
        </Link>
        <Link
          href="/work"
          className="btn-press rounded border border-[#E5E2DC] bg-white px-4 py-2.5 text-xs font-medium text-[#111214] hover:border-[#D1CDC4]"
        >
          Browse Work
        </Link>
      </div>
    </div>
  );
}
