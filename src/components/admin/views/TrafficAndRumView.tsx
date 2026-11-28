"use client";

import type { AdminDashboardSnapshot } from "@/lib/telemetry/types";
import { ProportionalBarList } from "../AdminCharts";
import { formatDurationMs, formatNumber } from "../adminFormat";

interface TrafficAndRumViewProps {
  data: AdminDashboardSnapshot;
}

function vitalTone(
  metric: "ttfb" | "fcp" | "lcp" | "cls" | "load",
  val: number | null
): string {
  if (val === null) return "text-[var(--ink-muted)]";
  if (metric === "ttfb") {
    return val <= 800
      ? "text-[var(--status-positive)]"
      : val <= 1800
        ? "text-[var(--status-warning)]"
        : "text-[var(--status-danger)]";
  }
  if (metric === "fcp") {
    return val <= 1800
      ? "text-[var(--status-positive)]"
      : val <= 3000
        ? "text-[var(--status-warning)]"
        : "text-[var(--status-danger)]";
  }
  if (metric === "lcp") {
    return val <= 2500
      ? "text-[var(--status-positive)]"
      : val <= 4000
        ? "text-[var(--status-warning)]"
        : "text-[var(--status-danger)]";
  }
  if (metric === "cls") {
    return val <= 0.1
      ? "text-[var(--status-positive)]"
      : val <= 0.25
        ? "text-[var(--status-warning)]"
        : "text-[var(--status-danger)]";
  }
  return val <= 2500
    ? "text-[var(--status-positive)]"
    : val <= 4500
      ? "text-[var(--status-warning)]"
      : "text-[var(--status-danger)]";
}

export function TrafficAndRumView({ data }: TrafficAndRumViewProps) {
  const { webVitals } = data;

  const vitalCards = [
    {
      key: "ttfb" as const,
      label: "TTFB (Time to First Byte)",
      target: "Good ≤ 800ms",
      stat: webVitals.ttfb,
      unit: "ms",
    },
    {
      key: "fcp" as const,
      label: "FCP (First Contentful Paint)",
      target: "Good ≤ 1800ms",
      stat: webVitals.fcp,
      unit: "ms",
    },
    {
      key: "lcp" as const,
      label: "LCP (Largest Contentful Paint)",
      target: "Good ≤ 2500ms",
      stat: webVitals.lcp,
      unit: "ms",
    },
    {
      key: "cls" as const,
      label: "CLS (Cumulative Layout Shift)",
      target: "Good ≤ 0.10",
      stat: webVitals.cls,
      unit: "",
    },
    {
      key: "load" as const,
      label: "Full Window Load",
      target: "Good ≤ 2500ms",
      stat: webVitals.loadTime,
      unit: "ms",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Core Web Vitals (Real User Monitoring) */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-[var(--ink-primary)]">
              Real User Monitoring (RUM) · Core Web Vitals
            </h2>
            <p className="font-mono text-[11px] text-[var(--ink-muted)]">
              Measured from live visitor browsers via PerformanceObserver ({webVitals.sampleCount} samples)
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {vitalCards.map((vc) => (
            <div
              key={vc.key}
              className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 p-3.5"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                {vc.label}
              </span>
              <p
                className={`mt-2 font-display text-2xl font-semibold tabular-nums ${vitalTone(vc.key, vc.stat.p75)}`}
              >
                {vc.stat.p75 !== null ? `${vc.stat.p75}${vc.unit}` : "—"}
              </p>
              <div className="mt-2 flex items-center justify-between border-t border-[var(--border-hairline)] pt-2 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                <span>P50: {vc.stat.p50 ?? "—"}</span>
                <span>P75: {vc.stat.p75 ?? "—"}</span>
                <span>P95: {vc.stat.p95 ?? "—"}</span>
              </div>
              <p className="mt-1 font-mono text-[9.5px] text-[var(--ink-muted)]">
                {vc.target}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Route-by-Route Performance Table */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
          Pages &amp; Case Studies Engagement
        </h3>
        <p className="mt-0.5 mb-3 font-mono text-[11px] text-[var(--ink-muted)]">
          Pageviews, unique IPs, average dwell time, scroll depth, and route-level LCP/TTFB
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                <th className="py-2 pr-3 font-medium">Route Path</th>
                <th className="py-2 pr-3 font-medium">Pageviews</th>
                <th className="py-2 pr-3 font-medium">Unique IPs</th>
                <th className="py-2 pr-3 font-medium">Avg Dwell</th>
                <th className="py-2 pr-3 font-medium">Avg Scroll</th>
                <th className="py-2 pr-3 font-medium">Avg TTFB</th>
                <th className="py-2 text-right font-medium">Avg LCP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {data.pages.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center font-mono text-xs text-[var(--ink-muted)]"
                  >
                    No page views captured in this time range.
                  </td>
                </tr>
              ) : (
                data.pages.map((pg) => (
                  <tr key={pg.path} className="hover:bg-[var(--bg-subtle)]/50">
                    <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-[var(--ink-primary)]">
                      {pg.path}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-primary)]">
                      {formatNumber(pg.views)}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-secondary)]">
                      {formatNumber(pg.uniqueIps)}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-secondary)]">
                      {formatDurationMs(pg.avgDurationMs)}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-secondary)]">
                      {pg.avgScrollDepth > 0 ? `${pg.avgScrollDepth}%` : "—"}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-secondary)]">
                      {pg.avgTtfbMs !== null ? `${pg.avgTtfbMs}ms` : "—"}
                    </td>
                    <td
                      className={`py-2.5 text-right font-mono font-semibold tabular-nums ${vitalTone("lcp", pg.avgLcpMs)}`}
                    >
                      {pg.avgLcpMs !== null ? `${pg.avgLcpMs}ms` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Attribution, Geography, and Technology Breakdowns */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <h3 className="mb-3.5 text-sm font-semibold text-[var(--ink-primary)]">
            Referrers &amp; Acquisition Sources
          </h3>
          <ProportionalBarList
            items={data.referrers}
            accentColor="var(--accent)"
          />
        </section>

        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <h3 className="mb-3.5 text-sm font-semibold text-[var(--ink-primary)]">
            Countries
          </h3>
          <ProportionalBarList
            items={data.countries}
            accentColor="var(--ink-primary)"
          />
        </section>

        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <h3 className="mb-3.5 text-sm font-semibold text-[var(--ink-primary)]">
            Top Cities
          </h3>
          <ProportionalBarList
            items={data.cities}
            accentColor="var(--accent-deep)"
          />
        </section>

        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <h3 className="mb-3.5 text-sm font-semibold text-[var(--ink-primary)]">
            Browsers
          </h3>
          <ProportionalBarList
            items={data.browsers}
            accentColor="var(--accent)"
          />
        </section>

        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <h3 className="mb-3.5 text-sm font-semibold text-[var(--ink-primary)]">
            Operating Systems &amp; Devices
          </h3>
          <ProportionalBarList
            items={data.operatingSystems}
            accentColor="var(--ink-secondary)"
            maxItems={5}
          />
          <div className="mt-4 border-t border-[var(--border-hairline)] pt-3">
            <ProportionalBarList
              items={data.deviceTypes}
              accentColor="var(--status-positive)"
              maxItems={4}
            />
          </div>
        </section>

        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <h3 className="mb-3.5 text-sm font-semibold text-[var(--ink-primary)]">
            Human vs Bot / Crawler Split &amp; UTMs
          </h3>
          <ProportionalBarList
            items={data.trafficClasses}
            accentColor="var(--status-warning)"
            maxItems={5}
          />
          {data.utmCampaigns.length > 0 && (
            <div className="mt-4 border-t border-[var(--border-hairline)] pt-3">
              <p className="mb-2 font-mono text-[10px] uppercase text-[var(--ink-muted)]">
                UTM Campaigns
              </p>
              <ProportionalBarList
                items={data.utmCampaigns}
                accentColor="var(--accent)"
                maxItems={4}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
