"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  BlurCrossfade,
  ClipSegmentedTabs,
  SPRING_TAB,
  type SegmentedTabOption,
} from "@/components/ui/MotionPrimitives";

interface SchematicProps {
  compact?: boolean;
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function handleTabListKeyDown(
  e: ReactKeyboardEvent<HTMLButtonElement>,
  idx: number,
  length: number,
  onSelect: (nextIdx: number) => void,
  refs: MutableRefObject<Array<HTMLButtonElement | null>>
) {
  let nextIdx: number | null = null;
  if (e.key === "ArrowRight") {
    nextIdx = (idx + 1) % length;
  } else if (e.key === "ArrowLeft") {
    nextIdx = (idx - 1 + length) % length;
  } else if (e.key === "Home") {
    nextIdx = 0;
  } else if (e.key === "End") {
    nextIdx = length - 1;
  }

  if (nextIdx !== null) {
    e.preventDefault();
    onSelect(nextIdx);
    refs.current[nextIdx]?.focus();
  }
}

/**
 * Fritsch-Carlson monotone cubic Bezier spline generator.
 * Guarantees smooth curvature without overshooting local financial extrema.
 */
function buildMonotoneCubicPath(xs: number[], ys: number[]): string {
  const n = xs.length;
  if (n === 0) return "";
  if (n === 1) return `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;

  const dx: number[] = new Array(n - 1);
  const slopes: number[] = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    slopes[i] = dx[i] !== 0 ? (ys[i + 1] - ys[i]) / dx[i] : 0;
  }

  const m: number[] = new Array(n);
  m[0] = slopes[0];
  m[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slopes[i]) < 1e-6) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / slopes[i];
      const beta = m[i + 1] / slopes[i];
      const magSq = alpha * alpha + beta * beta;
      if (magSq > 9) {
        const tau = 3 / Math.sqrt(magSq);
        m[i] = tau * alpha * slopes[i];
        m[i + 1] = tau * beta * slopes[i];
      }
    }
  }

  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const step = dx[i] / 3;
    const cp1x = xs[i] + step;
    const cp1y = ys[i] + m[i] * step;
    const cp2x = xs[i + 1] - step;
    const cp2y = ys[i + 1] - m[i + 1] * step;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${xs[i + 1].toFixed(1)},${ys[i + 1].toFixed(1)}`;
  }

  return d;
}

function buildMonotoneAreaPath(
  xs: number[],
  ys: number[],
  bottomY: number
): string {
  if (xs.length === 0) return "";
  const curve = buildMonotoneCubicPath(xs, ys);
  const lastX = xs[xs.length - 1].toFixed(1);
  const firstX = xs[0].toFixed(1);
  return `${curve} L${lastX},${bottomY.toFixed(1)} L${firstX},${bottomY.toFixed(1)} Z`;
}

/* -------------------------------------------------------------------------- */
/* 1. KORIDOR ENGINE OS: Geospatial Freight Corridor Topology Diagram         */
/* -------------------------------------------------------------------------- */

const KORIDOR_STAGES = [
  {
    id: "origin",
    code: "N-01",
    label: "Origin Hub",
    shortSvg: "ORIGIN HUB",
    coord: "6.45N 3.39E",
    tech: "GPS / WebSockets",
    metric: "12Hz Stream",
    x: 84,
    y: 98,
    labelOffset: -22,
    spec: "Live coordinate stream and vehicle status ingestion with heartbeat anomaly flags at dispatch origin.",
  },
  {
    id: "port",
    code: "N-02",
    label: "Port Clearance",
    shortSvg: "PORT CLEARANCE",
    coord: "6.21N 4.82E",
    tech: "Mapbox GL JS",
    metric: "Gate Verified",
    x: 240,
    y: 58,
    labelOffset: -20,
    spec: "Geospatial haulage corridor map rendering active trucks, customs waypoints, and rolling ETA deltas.",
  },
  {
    id: "transit",
    code: "N-03",
    label: "Transit Telemetry",
    shortSvg: "TRANSIT TELEMETRY",
    coord: "5.84N 6.14E",
    tech: "Google Gemini AI",
    metric: "Load Matched",
    x: 400,
    y: 96,
    labelOffset: 28,
    spec: "Automated cargo-to-fleet matching scoring carrier capacity, route overlap, and dispatch priority in flight.",
  },
  {
    id: "delivery",
    code: "N-04",
    label: "Final Delivery",
    shortSvg: "FINAL DELIVERY",
    coord: "5.52N 7.49E",
    tech: "Supabase PostgreSQL",
    metric: "RLS Ledger",
    x: 556,
    y: 56,
    labelOffset: 26,
    spec: "Role-isolated Row-Level Security tables separating shippers, fleet ops, and proof-of-delivery audit logs.",
  },
] as const;

const KORIDOR_SEGMENTS = [
  "M 84 98 C 142 98, 182 58, 240 58",
  "M 240 58 C 298 58, 342 96, 400 96",
  "M 400 96 C 458 96, 498 56, 556 56",
] as const;

const KORIDOR_FULL_SPLINE =
  "M 84 98 C 142 98, 182 58, 240 58 C 298 58, 342 96, 400 96 C 458 96, 498 56, 556 56";

export function KoridorSchematic({ compact = false }: SchematicProps) {
  const prefersReduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [selected, setSelected] = useState(2);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fullSplineRef = useRef<SVGPathElement | null>(null);
  const pulseRef = useRef<SVGGElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isVisibleRef = useRef(true);
  const activeStageRef = useRef(selected);

  useEffect(() => {
    activeStageRef.current = selected;
  }, [selected]);

  // Travelling Cobalt signal pulse along the active spline (paused offscreen, disabled in reduced motion)
  useEffect(() => {
    const el = containerRef.current;
    const pulseEl = pulseRef.current;

    if (prefersReduced || !el || !pulseEl) {
      if (pulseEl) pulseEl.style.opacity = "0";
      return;
    }

    let rafId: number | null = null;
    let startTime: number | null = null;
    const cycleMs = 3400;

    const tick = (now: number) => {
      if (!isVisibleRef.current) {
        rafId = null;
        return;
      }

      const path = fullSplineRef.current;
      const dot = pulseRef.current;
      if (path && dot) {
        if (startTime === null) startTime = now;
        const totalLength = path.getTotalLength();
        const activeIdx = activeStageRef.current;
        const targetFraction = activeIdx === 0 ? 0.33 : activeIdx / 3;
        const activeLength = totalLength * targetFraction;

        const rawT = ((now - startTime) % cycleMs) / cycleMs;
        const dist = rawT * activeLength;
        const pt = path.getPointAtLength(dist);

        // Soft fade-in at origin and fade-out at terminal stage
        const edgeFade =
          rawT < 0.08
            ? rawT / 0.08
            : rawT > 0.88
              ? (1 - rawT) / 0.12
              : 1;

        dot.style.transform = `translate3d(${pt.x.toFixed(2)}px, ${pt.y.toFixed(2)}px, 0px)`;
        dot.style.opacity = Math.max(0, Math.min(1, edgeFade)).toFixed(3);
      }

      rafId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (rafId === null && isVisibleRef.current) {
        startTime = null;
        rafId = requestAnimationFrame(tick);
      }
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isVisibleRef.current = Boolean(entry?.isIntersecting);
          if (isVisibleRef.current) {
            startLoop();
          } else {
            stopLoop();
          }
        },
        { threshold: 0.08 }
      );
      observer.observe(el);
      startLoop();

      return () => {
        observer.disconnect();
        stopLoop();
      };
    }

    startLoop();
    return () => {
      stopLoop();
    };
  }, [prefersReduced]);

  const active = KORIDOR_STAGES[selected];
  const progress = (selected + 1) / KORIDOR_STAGES.length;

  const shellClass = compact
    ? "w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--bg-canvas)] ring-1 ring-inset ring-[var(--border-hairline)]"
    : "w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-surface)]";

  return (
    <div ref={containerRef} className={shellClass}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 px-4 py-2.5 font-mono text-[11px]">
        <span className="flex items-center gap-2 font-semibold text-[var(--ink-primary)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[var(--accent)]"
          />
          KORIDOR GEOSPATIAL CORRIDOR TOPOLOGY
        </span>
        <span className="text-[var(--ink-muted)]">
          NEXT.JS · MAPBOX · GEMINI
        </span>
      </div>

      {/* Geospatial Vector Corridor SVG */}
      <div className="bg-[var(--bg-canvas)]/55 px-3 py-3">
        <svg
          viewBox="0 0 640 170"
          className="block h-auto w-full"
          role="img"
          aria-label="Geospatial freight corridor topology from Origin Hub through Port Clearance and Transit Telemetry to Final Delivery"
        >
          {/* Quiet Topographic Coordinate Ticks & Contours */}
          {[84, 240, 400, 556].map((x, idx) => (
            <g key={x}>
              <line
                x1={x}
                y1={14}
                x2={x}
                y2={136}
                stroke="rgba(15, 20, 30, 0.05)"
                strokeWidth="1"
              />
              <line
                x1={x}
                y1={10}
                x2={x}
                y2={16}
                stroke="rgba(15, 20, 30, 0.18)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={163}
                textAnchor={
                  idx === 0 ? "start" : idx === 3 ? "end" : "middle"
                }
                fill="#5B6475"
                fontSize="8.5"
                fontFamily="var(--font-geist-mono), ui-monospace, monospace"
              >
                {KORIDOR_STAGES[idx].coord}
              </text>
            </g>
          ))}

          {/* Subtle Cartographic Elevation Contours */}
          <path
            d="M 24 128 Q 160 88, 310 112 T 618 76"
            fill="none"
            stroke="rgba(15, 20, 30, 0.05)"
            strokeWidth="1"
          />
          <path
            d="M 24 44 Q 190 22, 354 52 T 618 32"
            fill="none"
            stroke="rgba(15, 20, 30, 0.045)"
            strokeWidth="1"
          />

          {/* Reference Latitude Scale Marker */}
          <text
            x="16"
            y="22"
            fill="#5B6475"
            fontSize="8.5"
            fontFamily="var(--font-geist-mono), ui-monospace, monospace"
          >
            CORRIDOR SECTOR A4
          </text>

          {/* Base Dashed Freight Spline */}
          <path
            ref={fullSplineRef}
            d={KORIDOR_FULL_SPLINE}
            fill="none"
            stroke="rgba(15, 20, 30, 0.16)"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />

          {/* Active Routed Spline Segments */}
          {KORIDOR_SEGMENTS.map((segD, segIdx) => {
            const isActiveLeg = segIdx < selected;
            return (
              <path
                key={segIdx}
                d={segD}
                fill="none"
                stroke="#1D4ED8"
                strokeWidth="2.4"
                strokeLinecap="round"
                style={{
                  opacity: isActiveLeg ? 1 : 0,
                  transition: prefersReduced
                    ? "none"
                    : "opacity 240ms var(--ease-out-expo)",
                }}
              />
            );
          })}

          {/* Travelling Cobalt Telemetry Signal Pulse (RAF + IntersectionObserver gated) */}
          <g
            ref={pulseRef}
            style={{
              opacity: 0,
              pointerEvents: "none",
            }}
          >
            <circle cx={0} cy={0} r="8" fill="rgba(29, 78, 216, 0.18)" />
            <circle cx={0} cy={0} r="3.4" fill="#1D4ED8" />
          </g>

          {/* 4 Precision Geospatial Vector Waypoint Nodes */}
          {KORIDOR_STAGES.map((stage, idx) => {
            const isReached = idx <= selected;
            const isCurrent = idx === selected;
            const labelY = stage.y + stage.labelOffset;
            const codeY =
              stage.labelOffset < 0 ? labelY - 11 : labelY + 11;

            return (
              <g
                key={stage.id}
                onClick={compact ? undefined : () => setSelected(idx)}
                className={compact ? undefined : "cursor-pointer"}
              >
                {/* Hit area for effortless click inspection */}
                {!compact && (
                  <circle cx={stage.x} cy={stage.y} r="18" fill="transparent" />
                )}

                {/* Precision Outer Reticle on Active Stage */}
                {isCurrent && (
                  <circle
                    cx={stage.x}
                    cy={stage.y}
                    r="11.5"
                    fill="rgba(29, 78, 216, 0.1)"
                    stroke="#1D4ED8"
                    strokeOpacity="0.45"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Primary Waypoint Node */}
                <circle
                  cx={stage.x}
                  cy={stage.y}
                  r={isCurrent ? "6.2" : "5"}
                  fill={isReached ? "#1D4ED8" : "#FFFFFF"}
                  stroke={isReached ? "#153AA2" : "#5B6475"}
                  strokeWidth="1.75"
                />
                {isReached && (
                  <circle cx={stage.x} cy={stage.y} r="2" fill="#FFFFFF" />
                )}

                {/* Node Title & Code */}
                <text
                  x={stage.x}
                  y={labelY}
                  textAnchor="middle"
                  fill={isCurrent ? "#0F141E" : "#434C5E"}
                  fontSize="9.5"
                  fontWeight={isCurrent ? "700" : "600"}
                  fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
                >
                  {stage.shortSvg}
                </text>
                <text
                  x={stage.x}
                  y={codeY}
                  textAnchor="middle"
                  fill={isCurrent ? "#153AA2" : "#5B6475"}
                  fontSize="8.5"
                  fontWeight="600"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                >
                  {stage.code} · {stage.metric}
                </text>
              </g>
            );
          })}

          {/* Corridor Progression Rail (GPU CSS transform: scaleX) */}
          <rect
            x="84"
            y="145"
            width="472"
            height="3"
            rx="1.5"
            fill="rgba(15, 20, 30, 0.08)"
          />
          <rect
            x="84"
            y="145"
            width="472"
            height="3"
            rx="1.5"
            fill="#1D4ED8"
            style={{
              transform: `scaleX(${progress.toFixed(4)})`,
              transformOrigin: "84px 146.5px",
              transition: prefersReduced
                ? "none"
                : "transform 280ms var(--ease-out-expo)",
            }}
          />
        </svg>
      </div>

      {/* Interactive Borderless 4-Stage Selector & Telemetry Readout (!compact) */}
      {!compact ? (
        <>
          <LayoutGroup id={`koridor-${uid}`}>
            <div
              role="tablist"
              aria-label="Inspect Koridor freight corridor stages"
              className="grid grid-cols-2 gap-px border-t border-[var(--border-hairline)] bg-[var(--border-hairline)] sm:grid-cols-4"
            >
              {KORIDOR_STAGES.map((stage, idx) => {
                const isSelected = idx === selected;
                return (
                  <button
                    key={stage.id}
                    ref={(el) => {
                      tabRefs.current[idx] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setSelected(idx)}
                    onKeyDown={(e) =>
                      handleTabListKeyDown(
                        e,
                        idx,
                        KORIDOR_STAGES.length,
                        setSelected,
                        tabRefs
                      )
                    }
                    className={`btn-press relative px-3.5 py-2.5 text-left ${
                      isSelected
                        ? "bg-[var(--accent-soft)] text-[var(--ink-primary)]"
                        : "bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="koridor-stage-bar"
                        transition={SPRING_TAB}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[var(--accent)]"
                      />
                    )}
                    <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                      <span
                        className={
                          isSelected
                            ? "font-semibold text-[var(--accent-deep)]"
                            : "text-[var(--ink-muted)]"
                        }
                      >
                        {stage.code}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${
                          idx <= selected
                            ? "bg-[var(--status-positive)]"
                            : "bg-[var(--border-strong)]"
                        }`}
                      />
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-[var(--ink-primary)]">
                      {stage.label}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                      {stage.tech}
                    </div>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/55 px-4 py-3">
            <BlurCrossfade contentKey={active.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-[var(--accent-deep)] tabular-nums">
                  <span>
                    {active.code} · {active.label.toUpperCase()}
                  </span>
                  <span className="text-[var(--ink-muted)]">
                    ({active.coord})
                  </span>
                </div>
                <span className="font-mono text-[11px] font-medium text-[var(--status-positive)]">
                  {active.metric}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-secondary)]">
                {active.spec}
              </p>
            </BlurCrossfade>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/55 px-4 py-2 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
          <span>4-STAGE HAULAGE ROUTE · LIVE TELEMETRY</span>
          <span className="font-medium text-[var(--status-positive)]">
            RLS ISOLATED
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. FORTRESS FLEET AI: Directional Multi-Agent Governance Pipeline          */
/* -------------------------------------------------------------------------- */

const FORTRESS_GATES = [
  {
    id: "router",
    code: "01",
    label: "Gemini / Gemma Router",
    svgTitle: "Gemini / Gemma",
    svgSub: "ROUTER",
    status: "VERIFIED",
    x: 164,
    detail:
      "Routes complex planning to Gemini while offloading fast policy classification and schema verification to Gemma 2.",
  },
  {
    id: "memory",
    code: "02",
    label: "pgvector Memory",
    svgTitle: "pgvector",
    svgSub: "MEMORY",
    status: "INDEXED",
    x: 300,
    detail:
      "Retrieves historical institutional directives and prior audit logs via Supabase PostgreSQL pgvector cosine similarity.",
  },
  {
    id: "guardrail",
    code: "03",
    label: "Tool Guardrail",
    svgTitle: "Tool Guardrail",
    svgSub: "POLICY GATE",
    status: "ENFORCED",
    x: 436,
    detail:
      "Intercepts outbound agent tool calls, validates schema and scope boundaries, and blocks unauthorized external mutations.",
  },
  {
    id: "cloudrun",
    code: "04",
    label: "Cloud Run Sandbox",
    svgTitle: "Cloud Run",
    svgSub: "SANDBOX",
    status: "ISOLATED",
    x: 572,
    detail:
      "Stateless containerized execution boundary providing reproducible governance logs and elastic burst capacity.",
  },
] as const;

export function FortressSchematic({ compact = false }: SchematicProps) {
  const prefersReduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [activeGate, setActiveGate] = useState(2);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const current = FORTRESS_GATES[activeGate];

  const shellClass = compact
    ? "w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--bg-canvas)] ring-1 ring-inset ring-[var(--border-hairline)]"
    : "w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-surface)]";

  return (
    <div className={shellClass}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 px-4 py-2.5 font-mono text-[11px]">
        <span className="flex items-center gap-2 font-semibold text-[var(--ink-primary)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[var(--status-positive)]"
          />
          FORTRESS MULTI-AGENT GOVERNANCE PIPELINE
        </span>
        <span className="text-[var(--ink-muted)]">CLOUD RUN · PGVECTOR</span>
      </div>

      {/* Directional SVG Governance Pipeline */}
      <div className="bg-[var(--bg-canvas)]/55 px-3 py-3">
        <svg
          viewBox="0 0 640 162"
          className="block h-auto w-full"
          role="img"
          aria-label="Multi-agent governance pipeline from Prompt through Gemini and Gemma Router, pgvector Memory, Tool Guardrail, and Cloud Run Sandbox"
        >
          {/* Origin Prompt Terminal */}
          <g>
            <rect
              x="14"
              y="52"
              width="66"
              height="38"
              rx="8"
              fill="#0F141E"
            />
            <text
              x="47"
              y="69"
              textAnchor="middle"
              fill="#F8F9FB"
              fontSize="9"
              fontWeight="600"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              PROMPT
            </text>
            <text
              x="47"
              y="81"
              textAnchor="middle"
              fill="rgba(248, 249, 251, 0.72)"
              fontSize="8"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              INGRESS
            </text>
          </g>

          {/* Connector: Prompt -> Gate 01 */}
          <path
            d="M 80 71 L 112 71"
            fill="none"
            stroke="#1D4ED8"
            strokeWidth="2"
          />
          <polygon points="110,67.5 117,71 110,74.5" fill="#1D4ED8" />

          {/* Connectors between Gates 01 -> 02 -> 03 -> 04 */}
          {[0, 1, 2].map((segIdx) => {
            const x1 = FORTRESS_GATES[segIdx].x + 48;
            const x2 = FORTRESS_GATES[segIdx + 1].x - 52;
            const verified = segIdx < activeGate;
            return (
              <g key={segIdx}>
                <line
                  x1={x1}
                  y1={71}
                  x2={x2}
                  y2={71}
                  stroke={verified ? "#1D4ED8" : "rgba(15, 20, 30, 0.18)"}
                  strokeWidth={verified ? "2" : "1.5"}
                  strokeDasharray={verified ? undefined : "3 3"}
                  style={{
                    transition: prefersReduced
                      ? "none"
                      : "stroke 200ms ease, stroke-width 200ms ease",
                  }}
                />
                <polygon
                  points={`${x2 - 2},67.5 ${x2 + 5},71 ${x2 - 2},74.5`}
                  fill={verified ? "#1D4ED8" : "rgba(15, 20, 30, 0.28)"}
                />
              </g>
            );
          })}

          {/* Orthogonal Audit Return Bus below Gates */}
          <path
            d="M 164 102 L 164 134 L 572 134 L 572 102"
            fill="none"
            stroke="rgba(15, 20, 30, 0.1)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          {[300, 436].map((tx) => (
            <line
              key={tx}
              x1={tx}
              y1={102}
              x2={tx}
              y2={134}
              stroke="rgba(15, 20, 30, 0.1)"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          ))}
          <rect
            x="256"
            y="125"
            width="224"
            height="18"
            rx="4"
            fill="#F8F9FB"
            stroke="rgba(15, 20, 30, 0.08)"
            strokeWidth="1"
          />
          <text
            x="368"
            y="137"
            textAnchor="middle"
            fill="#5B6475"
            fontSize="8.5"
            fontWeight="500"
            fontFamily="var(--font-geist-mono), ui-monospace, monospace"
          >
            IMMUTABLE AUDIT LOG · ZERO UNVERIFIED TOOLS
          </text>

          {/* 4 Governance Checkpoint Nodes */}
          {FORTRESS_GATES.map((gate, i) => {
            const isVerified = i <= activeGate;
            const isSelected = i === activeGate;
            const rectX = gate.x - 48;

            return (
              <g
                key={gate.id}
                onClick={compact ? undefined : () => setActiveGate(i)}
                className={compact ? undefined : "cursor-pointer"}
              >
                {/* Outer Active Focus Halo */}
                {isSelected && (
                  <rect
                    x={rectX - 4}
                    y={36}
                    width="104"
                    height="70"
                    rx="12"
                    fill="rgba(29, 78, 216, 0.07)"
                    stroke="#1D4ED8"
                    strokeOpacity="0.55"
                    strokeWidth="1.25"
                  />
                )}

                {/* Gate Node Plate */}
                <rect
                  x={rectX}
                  y={40}
                  width="96"
                  height="62"
                  rx="9"
                  fill={isSelected ? "#EEF3FF" : "#FFFFFF"}
                  stroke={
                    isSelected
                      ? "#1D4ED8"
                      : isVerified
                        ? "rgba(29, 78, 216, 0.35)"
                        : "rgba(15, 20, 30, 0.14)"
                  }
                  strokeWidth={isSelected ? "1.6" : "1.1"}
                />

                {/* Top Gate Number & Verification Dot */}
                <text
                  x={rectX + 10}
                  y={54}
                  fill={isVerified ? "#153AA2" : "#5B6475"}
                  fontSize="8.5"
                  fontWeight="600"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                >
                  G-{gate.code}
                </text>
                <circle
                  cx={rectX + 84}
                  cy={51}
                  r="3.2"
                  fill={isVerified ? "#136F3A" : "rgba(15, 20, 30, 0.16)"}
                />

                {/* Node Title */}
                <text
                  x={gate.x}
                  y={74}
                  textAnchor="middle"
                  fill="#0F141E"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
                >
                  {gate.svgTitle}
                </text>

                {/* Status Chip */}
                <text
                  x={gate.x}
                  y={90}
                  textAnchor="middle"
                  fill={isVerified ? "#136F3A" : "#5B6475"}
                  fontSize="8.2"
                  fontWeight="600"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                >
                  {isVerified ? gate.status : gate.svgSub}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Checkpoint Selector with Shared layoutId Ring (!compact) */}
      {!compact ? (
        <>
          <LayoutGroup id={`fortress-${uid}`}>
            <div
              role="tablist"
              aria-label="Inspect Fortress governance checkpoint gates"
              className="grid grid-cols-2 gap-2 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3 sm:grid-cols-4"
            >
              {FORTRESS_GATES.map((gate, i) => {
                const isSelected = i === activeGate;
                const isVerified = i <= activeGate;
                return (
                  <button
                    key={gate.id}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveGate(i)}
                    onKeyDown={(e) =>
                      handleTabListKeyDown(
                        e,
                        i,
                        FORTRESS_GATES.length,
                        setActiveGate,
                        tabRefs
                      )
                    }
                    className={`btn-press relative rounded-[var(--radius-sm)] px-3 py-2 text-left ${
                      isSelected
                        ? "bg-[var(--accent-soft)]/70 text-[var(--ink-primary)]"
                        : "bg-[var(--bg-subtle)]/65 text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="fortress-active-ring"
                        transition={SPRING_TAB}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-[var(--radius-sm)] ring-[1.5px] ring-inset ring-[var(--accent)]"
                      />
                    )}
                    <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                      <span
                        className={
                          isSelected
                            ? "font-semibold text-[var(--accent-deep)]"
                            : "text-[var(--ink-muted)]"
                        }
                      >
                        GATE {gate.code}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isVerified
                            ? "bg-[var(--status-positive)]"
                            : "bg-[var(--border-strong)]"
                        }`}
                      />
                    </div>
                    <div className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-primary)]">
                      {gate.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/55 px-4 py-3">
            <BlurCrossfade contentKey={current.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
                <span className="font-semibold text-[var(--accent-deep)]">
                  CHECKPOINT AUDIT · GATE {current.code} ({current.label})
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-positive)]">
                  {current.status} · POLICY PASS
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-secondary)]">
                {current.detail}
              </p>
            </BlurCrossfade>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/55 px-4 py-2 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
          <span>4 CHECKPOINTS · PROMPT TO CLOUD RUN</span>
          <span className="font-medium text-[var(--status-positive)]">
            POLICY ENFORCED
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. INSTITUTIONAL CRYPTO & WEALTH PLATFORM: Monotone SVG Feed & Ledger      */
/* -------------------------------------------------------------------------- */

type CryptoPeriod = "24H" | "7D" | "30D";

const CRYPTO_PERIOD_OPTIONS: ReadonlyArray<SegmentedTabOption<CryptoPeriod>> = [
  { value: "24H", label: "24H" },
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
];

const CRYPTO_SERIES: Record<
  CryptoPeriod,
  {
    points: number[];
    timestamps: string[];
    delta: string;
    apy: string;
    feedLatency: string;
  }
> = {
  "24H": {
    points: [99.4, 99.8, 99.6, 100.2, 100.9, 100.5, 101.4, 101.8, 102.1],
    timestamps: [
      "00:00",
      "03:00",
      "06:00",
      "09:00",
      "12:00",
      "15:00",
      "18:00",
      "21:00",
      "24:00",
    ],
    delta: "+2.71%",
    apy: "6.40% APR",
    feedLatency: "38ms WS",
  },
  "7D": {
    points: [96.2, 97.5, 97.1, 98.9, 100.4, 99.8, 102.3, 103.6, 104.8],
    timestamps: [
      "D-08",
      "D-07",
      "D-06",
      "D-05",
      "D-04",
      "D-03",
      "D-02",
      "D-01",
      "NOW",
    ],
    delta: "+8.94%",
    apy: "6.42% APR",
    feedLatency: "41ms WS",
  },
  "30D": {
    points: [91.0, 93.4, 92.8, 96.5, 98.1, 101.2, 103.9, 106.4, 109.2],
    timestamps: [
      "D-30",
      "D-26",
      "D-22",
      "D-18",
      "D-14",
      "D-10",
      "D-06",
      "D-03",
      "NOW",
    ],
    delta: "+20.00%",
    apy: "6.45% APR",
    feedLatency: "39ms WS",
  },
};

const CRYPTO_SVG_W = 600;
const CRYPTO_PAD_L = 44;
const CRYPTO_PAD_R = 18;
const CRYPTO_PAD_T = 18;
const CRYPTO_PAD_B = 24;
const CRYPTO_PLOT_W = CRYPTO_SVG_W - CRYPTO_PAD_L - CRYPTO_PAD_R;
const CRYPTO_MORPH_MS = 280;

export function CryptoWealthSchematic({ compact = false }: SchematicProps) {
  const prefersReduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const gradId = `crypto-area-${uid}`;

  const [period, setPeriod] = useState<CryptoPeriod>("7D");
  const current = CRYPTO_SERIES[period];

  const svgH = compact ? 142 : 196;
  const plotH = svgH - CRYPTO_PAD_T - CRYPTO_PAD_B;
  const plotBottom = CRYPTO_PAD_T + plotH;

  const xs = useMemo(
    () =>
      Array.from(
        { length: 9 },
        (_, i) => CRYPTO_PAD_L + (i / 8) * CRYPTO_PLOT_W
      ),
    []
  );

  const computed = useMemo(() => {
    const rawMin = Math.min(...current.points);
    const rawMax = Math.max(...current.points);
    const pad = Math.max(0.8, (rawMax - rawMin) * 0.14);
    const min = rawMin - pad;
    const max = rawMax + pad;
    const span = max - min || 1;

    const ys = current.points.map(
      (val) => CRYPTO_PAD_T + plotH - ((val - min) / span) * plotH
    );

    const tickCount = 4;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const frac = i / (tickCount - 1);
      const val = min + frac * span;
      const y = CRYPTO_PAD_T + plotH - frac * plotH;
      return { val, y };
    });

    return { ys, ticks };
  }, [current, plotH]);

  // Freeze initial geometry for SSR/hydration; subsequent switches morph via DOM refs
  const [initialYs] = useState<number[]>(() => computed.ys);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const linePathRef = useRef<SVGPathElement | null>(null);
  const areaPathRef = useRef<SVGPathElement | null>(null);
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const crosshairRef = useRef<SVGGElement | null>(null);
  const activeDotRef = useRef<SVGGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const liveYsRef = useRef<number[]>(computed.ys.slice());
  const seriesRef = useRef(current);
  const morphRafRef = useRef<number | null>(null);
  const scrubRafRef = useRef<number | null>(null);
  const pointerClientXRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    seriesRef.current = current;
  }, [current]);

  const applyCryptoYs = useCallback(
    (ys: number[]) => {
      liveYsRef.current = ys;
      if (linePathRef.current) {
        linePathRef.current.setAttribute("d", buildMonotoneCubicPath(xs, ys));
      }
      if (areaPathRef.current) {
        areaPathRef.current.setAttribute(
          "d",
          buildMonotoneAreaPath(xs, ys, plotBottom)
        );
      }
      for (let i = 0; i < ys.length; i++) {
        const dot = dotRefs.current[i];
        if (dot) dot.setAttribute("cy", ys[i].toFixed(2));
      }
    },
    [xs, plotBottom]
  );

  useEffect(() => {
    const targetYs = computed.ys;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      applyCryptoYs(targetYs.slice());
      return;
    }

    if (morphRafRef.current !== null) {
      cancelAnimationFrame(morphRafRef.current);
      morphRafRef.current = null;
    }

    if (prefersReduced) {
      applyCryptoYs(targetYs.slice());
      return;
    }

    const startYs = liveYsRef.current.slice();
    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / CRYPTO_MORPH_MS);
      const k = easeOutExpo(progress);
      const nextYs = startYs.map((v, i) => v + (targetYs[i] - v) * k);
      applyCryptoYs(nextYs);

      if (progress < 1) {
        morphRafRef.current = requestAnimationFrame(step);
      } else {
        morphRafRef.current = null;
        applyCryptoYs(targetYs.slice());
      }
    };

    morphRafRef.current = requestAnimationFrame(step);
    return () => {
      if (morphRafRef.current !== null) {
        cancelAnimationFrame(morphRafRef.current);
        morphRafRef.current = null;
      }
    };
  }, [computed.ys, prefersReduced, applyCryptoYs]);

  useEffect(() => {
    return () => {
      if (scrubRafRef.current !== null) {
        cancelAnimationFrame(scrubRafRef.current);
        scrubRafRef.current = null;
      }
    };
  }, []);

  const hideScrubber = useCallback(() => {
    pointerClientXRef.current = null;
    if (scrubRafRef.current !== null) {
      cancelAnimationFrame(scrubRafRef.current);
      scrubRafRef.current = null;
    }
    if (crosshairRef.current) crosshairRef.current.style.opacity = "0";
    if (activeDotRef.current) activeDotRef.current.style.opacity = "0";
    if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
  }, []);

  const flushScrubber = useCallback(() => {
    scrubRafRef.current = null;
    const clientX = pointerClientXRef.current;
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (clientX === null || !svg || !wrap) return;

    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width <= 0) return;

    const svgX = ((clientX - svgRect.left) / svgRect.width) * CRYPTO_SVG_W;
    const clampedX = Math.max(
      CRYPTO_PAD_L,
      Math.min(CRYPTO_PAD_L + CRYPTO_PLOT_W, svgX)
    );
    const ratio = (clampedX - CRYPTO_PAD_L) / CRYPTO_PLOT_W;
    const idx = Math.max(0, Math.min(8, Math.round(ratio * 8)));

    const x = xs[idx];
    const y = liveYsRef.current[idx];
    const series = seriesRef.current;
    const val = series.points[idx];
    const baseVal = series.points[0];
    const navDeltaPct = ((val - baseVal) / baseVal) * 100;
    const sign = navDeltaPct >= 0 ? "+" : "";

    if (crosshairRef.current) {
      crosshairRef.current.style.transform = `translate3d(${x.toFixed(2)}px, 0px, 0px)`;
      crosshairRef.current.style.opacity = "1";
    }

    if (activeDotRef.current) {
      activeDotRef.current.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0px)`;
      activeDotRef.current.style.opacity = "1";
    }

    if (tooltipRef.current) {
      tooltipRef.current.textContent = `${series.timestamps[idx]} · NAV ${val.toFixed(2)} · ${sign}${navDeltaPct.toFixed(2)}%`;

      const wrapRect = wrap.getBoundingClientRect();
      const tipW = tooltipRef.current.offsetWidth || 196;
      const anchorCssX =
        svgRect.left - wrapRect.left + (x / CRYPTO_SVG_W) * svgRect.width;
      const clampedTipX = Math.max(
        8,
        Math.min(wrapRect.width - tipW - 8, anchorCssX - tipW / 2)
      );

      tooltipRef.current.style.transform = `translate3d(${clampedTipX.toFixed(1)}px, 8px, 0px)`;
      tooltipRef.current.style.opacity = "1";
    }
  }, [xs]);

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (compact) return;
      pointerClientXRef.current = e.clientX;
      if (scrubRafRef.current === null) {
        scrubRafRef.current = requestAnimationFrame(flushScrubber);
      }
    },
    [compact, flushScrubber]
  );

  const shellClass = compact
    ? "w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--bg-canvas)] ring-1 ring-inset ring-[var(--border-hairline)]"
    : "w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-surface)]";

  return (
    <div className={shellClass}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 px-4 py-2.5 font-mono text-[11px]">
        <span className="flex items-center gap-2 font-semibold text-[var(--ink-primary)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[var(--accent)]"
          />
          WEBSOCKET TICKER &amp; PG YIELD ENGINE
        </span>

        {!compact ? (
          <ClipSegmentedTabs
            size="sm"
            options={CRYPTO_PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            ariaLabel="Select crypto wealth telemetry timeframe"
          />
        ) : (
          <span className="font-semibold tabular-nums text-[var(--status-positive)]">
            {current.delta}
          </span>
        )}
      </div>

      {/* Monotone Cubic SVG Equity Chart */}
      <div
        ref={wrapRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={hideScrubber}
        onPointerCancel={hideScrubber}
        className={`relative bg-[var(--bg-canvas)]/55 px-3 py-3 select-none ${
          compact ? "" : "cursor-crosshair touch-pan-y"
        }`}
      >
        {!compact && (
          <div
            ref={tooltipRef}
            aria-hidden="true"
            style={{
              opacity: 0,
              transform: "translate3d(8px, 8px, 0px)",
              transition: "opacity 140ms ease-out",
            }}
            className="pointer-events-none absolute top-0 left-0 z-10 rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)]/95 px-2.5 py-1 font-mono text-[11px] font-medium whitespace-nowrap tabular-nums text-[var(--ink-primary)] shadow-[var(--shadow-surface)]"
          />
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${CRYPTO_SVG_W} ${svgH}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Smooth monotone SVG portfolio NAV chart with Cobalt area gradient"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.18" />
              <stop offset="75%" stopColor="#1D4ED8" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal Y-Axis Tick Hairlines */}
          {computed.ticks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={CRYPTO_PAD_L}
                y1={tick.y}
                x2={CRYPTO_SVG_W - CRYPTO_PAD_R}
                y2={tick.y}
                stroke="rgba(15, 20, 30, 0.075)"
                strokeWidth="1"
              />
              <text
                x={CRYPTO_PAD_L - 8}
                y={tick.y + 3.5}
                textAnchor="end"
                fill="#5B6475"
                fontSize="9.5"
                fontFamily="var(--font-geist-mono), ui-monospace, monospace"
              >
                {tick.val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* X-Axis Timestamps */}
          {[0, 2, 4, 6, 8].map((stepIdx) => (
            <text
              key={stepIdx}
              x={xs[stepIdx]}
              y={svgH - 6}
              textAnchor={
                stepIdx === 0 ? "start" : stepIdx === 8 ? "end" : "middle"
              }
              fill="#5B6475"
              fontSize="9"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              {current.timestamps[stepIdx]}
            </text>
          ))}

          {/* Cobalt Gradient Area Fill */}
          <path
            ref={areaPathRef}
            d={buildMonotoneAreaPath(xs, initialYs, plotBottom)}
            fill={`url(#${gradId})`}
          />

          {/* Monotone Cubic Bezier Curve */}
          <path
            ref={linePathRef}
            d={buildMonotoneCubicPath(xs, initialYs)}
            fill="none"
            stroke="#1D4ED8"
            strokeWidth="2.25"
            strokeLinecap="round"
          />

          {/* Anchor Points */}
          {initialYs.map((y, idx) => {
            const isTerminal = idx === initialYs.length - 1;
            return (
              <circle
                key={idx}
                ref={(el) => {
                  dotRefs.current[idx] = el;
                }}
                cx={xs[idx]}
                cy={y}
                r={isTerminal ? 3.8 : 2.1}
                fill={isTerminal ? "#1D4ED8" : "#FFFFFF"}
                stroke="#1D4ED8"
                strokeWidth={isTerminal ? "1.6" : "1.25"}
              />
            );
          })}

          {/* Pointer Crosshair Scrubber (!compact, zero useState) */}
          {!compact && (
            <>
              <g
                ref={crosshairRef}
                style={{
                  opacity: 0,
                  transition: "opacity 140ms ease-out",
                  pointerEvents: "none",
                }}
              >
                <line
                  x1={0}
                  y1={CRYPTO_PAD_T}
                  x2={0}
                  y2={plotBottom}
                  stroke="#1D4ED8"
                  strokeOpacity="0.45"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
              </g>
              <g
                ref={activeDotRef}
                style={{
                  opacity: 0,
                  transition: "opacity 140ms ease-out",
                  pointerEvents: "none",
                }}
              >
                <circle cx={0} cy={0} r="7" fill="rgba(29, 78, 216, 0.16)" />
                <circle
                  cx={0}
                  cy={0}
                  r="3.6"
                  fill="#1D4ED8"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                />
              </g>
            </>
          )}
        </svg>
      </div>

      {/* Telemetry Footer */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border-hairline)] border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/55 font-mono text-[11px]">
        <div className="px-3.5 py-2.5">
          <div className="text-[11px] text-[var(--ink-muted)]">INDEX DELTA</div>
          <div className="mt-0.5 font-semibold tabular-nums text-[var(--status-positive)]">
            <BlurCrossfade inline contentKey={`${period}-delta`}>
              {current.delta}
            </BlurCrossfade>
          </div>
        </div>
        <div className="px-3.5 py-2.5">
          <div className="text-[11px] text-[var(--ink-muted)]">
            PG YIELD CRON
          </div>
          <div className="mt-0.5 font-semibold tabular-nums text-[var(--ink-primary)]">
            <BlurCrossfade inline contentKey={`${period}-apy`}>
              {current.apy}
            </BlurCrossfade>
          </div>
        </div>
        <div className="px-3.5 py-2.5">
          <div className="text-[11px] text-[var(--ink-muted)]">TICKER FEED</div>
          <div className="mt-0.5 font-semibold tabular-nums text-[var(--accent-deep)]">
            <BlurCrossfade inline contentKey={`${period}-feed`}>
              {current.feedLatency}
            </BlurCrossfade>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. STITCH RETAIL OPERATIONS OS: Hub-and-Spoke Sync Ledger Diagram          */
/* -------------------------------------------------------------------------- */

const STITCH_BRANCHES = [
  {
    id: "central",
    code: "BR-01",
    name: "Branch 01 · Central",
    svgLabel: "Branch 01 · Central",
    skus: "1,420 Active SKUs",
    shortCount: "1,420 SKUs",
    posSync: "Reconciled",
    variance: "0.00%",
    restock: "4 Supplier POs Queued",
    y: 34,
  },
  {
    id: "express",
    code: "BR-02",
    name: "Branch 02 · Express",
    svgLabel: "Branch 02 · Express",
    skus: "890 Active SKUs",
    shortCount: "890 SKUs",
    posSync: "Reconciled",
    variance: "0.00%",
    restock: "2 Transfers Pending",
    y: 84,
  },
  {
    id: "supplier",
    code: "SUP-03",
    name: "Supplier Hub",
    svgLabel: "Supplier Hub",
    skus: "18 Active Vendors",
    shortCount: "18 Vendors",
    posSync: "Invoice Matched",
    variance: "Verified",
    restock: "Auto-Ledger Synced",
    y: 134,
  },
] as const;

export function StitchRetailSchematic({ compact = false }: SchematicProps) {
  const prefersReduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [branchIdx, setBranchIdx] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = STITCH_BRANCHES[branchIdx];

  const shellClass = compact
    ? "w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--bg-canvas)] ring-1 ring-inset ring-[var(--border-hairline)]"
    : "w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-surface)]";

  return (
    <div className={shellClass}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 px-4 py-2.5 font-mono text-[11px]">
        <span className="flex items-center gap-2 font-semibold text-[var(--ink-primary)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[var(--accent)]"
          />
          STITCH MULTI-BRANCH LEDGER &amp; POS SYNC
        </span>
        <span className="font-medium text-[var(--accent-deep)]">
          GOOGLE STITCH LOOP
        </span>
      </div>

      {/* Hub-and-Spoke Vector Ledger Diagram */}
      <div className="bg-[var(--bg-canvas)]/55 px-3 py-3">
        <svg
          viewBox="0 0 640 168"
          className="block h-auto w-full"
          role="img"
          aria-label="Multi-branch hub-and-spoke synchronization diagram connecting Central Branch, Express Branch, and Supplier Hub into a Central PostgreSQL Reconciliation Core"
        >
          {/* Spoke-to-Core Orthogonal Sync Connectors */}
          {STITCH_BRANCHES.map((branch, idx) => {
            const isActive = idx === branchIdx;
            const pathD = `M 228 ${branch.y} L 298 ${branch.y} L 298 84 L 366 84`;
            return (
              <g key={branch.id}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={isActive ? "#1D4ED8" : "rgba(15, 20, 30, 0.16)"}
                  strokeWidth={isActive ? "2.2" : "1.35"}
                  strokeDasharray={isActive ? undefined : "3 3"}
                  strokeLinejoin="round"
                  style={{
                    transition: prefersReduced
                      ? "none"
                      : "stroke 200ms ease, stroke-width 200ms ease",
                  }}
                />
                {/* Junction Port Marker */}
                <circle
                  cx="228"
                  cy={branch.y}
                  r={isActive ? "3.5" : "2.6"}
                  fill={isActive ? "#1D4ED8" : "#FFFFFF"}
                  stroke={isActive ? "#153AA2" : "rgba(15, 20, 30, 0.28)"}
                  strokeWidth="1.4"
                />
              </g>
            );
          })}

          {/* Bus Sync Arrowhead into PostgreSQL Core */}
          <polygon points="362,80 370,84 362,88" fill="#1D4ED8" />
          <circle
            cx="298"
            cy="84"
            r="4"
            fill="#1D4ED8"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <text
            x="332"
            y="74"
            textAnchor="middle"
            fill="#153AA2"
            fontSize="8.5"
            fontWeight="600"
            fontFamily="var(--font-geist-mono), ui-monospace, monospace"
          >
            SYNC
          </text>

          {/* 3 Left-Side Branch Spoke Nodes */}
          {STITCH_BRANCHES.map((branch, idx) => {
            const isActive = idx === branchIdx;
            const topY = branch.y - 19;
            return (
              <g
                key={branch.id}
                onClick={compact ? undefined : () => setBranchIdx(idx)}
                className={compact ? undefined : "cursor-pointer"}
              >
                <rect
                  x="18"
                  y={topY}
                  width="210"
                  height="38"
                  rx="8"
                  fill={isActive ? "#EEF3FF" : "#FFFFFF"}
                  stroke={
                    isActive ? "#1D4ED8" : "rgba(15, 20, 30, 0.12)"
                  }
                  strokeWidth={isActive ? "1.5" : "1"}
                />
                <circle
                  cx="32"
                  cy={branch.y}
                  r="3.2"
                  fill="#136F3A"
                />
                <text
                  x="44"
                  y={branch.y - 3}
                  fill="#0F141E"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
                >
                  {branch.svgLabel}
                </text>
                <text
                  x="44"
                  y={branch.y + 10}
                  fill={isActive ? "#153AA2" : "#5B6475"}
                  fontSize="8.5"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                >
                  {branch.shortCount} · {branch.posSync}
                </text>
              </g>
            );
          })}

          {/* Central PostgreSQL Reconciliation Core (Right Hub) */}
          <g>
            <rect
              x="372"
              y="24"
              width="248"
              height="120"
              rx="12"
              fill="#FFFFFF"
              stroke="rgba(29, 78, 216, 0.28)"
              strokeWidth="1.25"
            />
            <rect
              x="372"
              y="24"
              width="248"
              height="28"
              rx="12"
              fill="#F1F3F7"
            />
            <rect x="372" y="40" width="248" height="12" fill="#F1F3F7" />
            <line
              x1="372"
              y1="52"
              x2="620"
              y2="52"
              stroke="rgba(15, 20, 30, 0.08)"
              strokeWidth="1"
            />

            {/* Vector Database Cylinder Icon */}
            <ellipse
              cx="392"
              cy="35"
              rx="7"
              ry="3"
              fill="#EEF3FF"
              stroke="#1D4ED8"
              strokeWidth="1.2"
            />
            <path
              d="M 385 35 L 385 43 C 385 44.8, 399 44.8, 399 43 L 399 35"
              fill="none"
              stroke="#1D4ED8"
              strokeWidth="1.2"
            />

            <text
              x="408"
              y="41.5"
              fill="#0F141E"
              fontSize="9"
              fontWeight="700"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              POSTGRESQL LEDGER CORE
            </text>

            {/* Core Live Metrics */}
            <text
              x="388"
              y="74"
              fill="#5B6475"
              fontSize="8.5"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              ACTIVE SPOKE
            </text>
            <text
              x="604"
              y="74"
              textAnchor="end"
              fill="#153AA2"
              fontSize="9"
              fontWeight="600"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              {current.code} · {current.shortCount}
            </text>

            <line
              x1="388"
              y1="85"
              x2="604"
              y2="85"
              stroke="rgba(15, 20, 30, 0.07)"
              strokeWidth="1"
            />

            <text
              x="388"
              y="104"
              fill="#5B6475"
              fontSize="8.5"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              POS VARIANCE
            </text>
            <text
              x="604"
              y="104"
              textAnchor="end"
              fill="#136F3A"
              fontSize="9.5"
              fontWeight="700"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              {current.variance}
            </text>

            <line
              x1="388"
              y1="115"
              x2="604"
              y2="115"
              stroke="rgba(15, 20, 30, 0.07)"
              strokeWidth="1"
            />

            <text
              x="388"
              y="132"
              fill="#5B6475"
              fontSize="8.5"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              STATUS
            </text>
            <text
              x="604"
              y="132"
              textAnchor="end"
              fill="#0F141E"
              fontSize="8.8"
              fontWeight="600"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              ACID RECONCILED
            </text>
          </g>
        </svg>
      </div>

      {/* Active Branch Selector & Audit Strip (!compact) */}
      {!compact ? (
        <>
          <LayoutGroup id={`stitch-${uid}`}>
            <div
              role="tablist"
              aria-label="Inspect Stitch retail branch synchronization"
              className="grid grid-cols-3 divide-x divide-[var(--border-hairline)] border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]"
            >
              {STITCH_BRANCHES.map((branch, idx) => {
                const active = idx === branchIdx;
                return (
                  <button
                    key={branch.id}
                    ref={(el) => {
                      tabRefs.current[idx] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setBranchIdx(idx)}
                    onKeyDown={(e) =>
                      handleTabListKeyDown(
                        e,
                        idx,
                        STITCH_BRANCHES.length,
                        setBranchIdx,
                        tabRefs
                      )
                    }
                    className={`btn-press relative px-3.5 py-2.5 text-left ${
                      active
                        ? "bg-[var(--accent-soft)]/55 text-[var(--ink-primary)]"
                        : "bg-transparent text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]/60 hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="stitch-branch-bar"
                        transition={SPRING_TAB}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[var(--accent)]"
                      />
                    )}
                    <div className="truncate text-xs font-semibold text-[var(--ink-primary)]">
                      {branch.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                      {branch.skus}
                    </div>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/55">
            <BlurCrossfade contentKey={current.id}>
              <div className="grid grid-cols-3 divide-x divide-[var(--border-hairline)] font-mono text-[11px]">
                <div className="px-3.5 py-2.5">
                  <div className="text-[11px] text-[var(--ink-muted)]">
                    POS VARIANCE
                  </div>
                  <div className="mt-0.5 font-semibold tabular-nums text-[var(--status-positive)]">
                    {current.variance}
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[11px] text-[var(--ink-muted)]">
                    WORKFLOW STATE
                  </div>
                  <div className="mt-0.5 font-semibold tabular-nums text-[var(--ink-primary)]">
                    {current.restock}
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[11px] text-[var(--ink-muted)]">
                    AUDIT TRAIL
                  </div>
                  <div className="mt-0.5 font-semibold text-[var(--accent-deep)]">
                    POSTGRES LEDGER
                  </div>
                </div>
              </div>
            </BlurCrossfade>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 divide-x divide-[var(--border-hairline)] border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/55 font-mono text-[11px] tabular-nums">
          <div className="px-3.5 py-2">
            <span className="text-[var(--ink-muted)]">SKUS </span>
            <span className="font-semibold text-[var(--ink-primary)]">
              2,310
            </span>
          </div>
          <div className="px-3.5 py-2">
            <span className="text-[var(--ink-muted)]">VAR </span>
            <span className="font-semibold text-[var(--status-positive)]">
              0.00%
            </span>
          </div>
          <div className="px-3.5 py-2 text-right font-medium text-[var(--accent-deep)]">
            PG LEDGER
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. PRODUCTION E-COMMERCE BUILDS: Horizontal SVG Commerce Pipeline          */
/* -------------------------------------------------------------------------- */

const COMMERCE_STAGES = [
  {
    step: "01",
    title: "Catalog Edge",
    svgTitle: "Catalog Edge",
    meta: "Cloudflare DNS & TLS",
    protocol: "TLS 1.3",
    metric: "14ms TTFB",
    x: 84,
    detail:
      "Custom domain routing, hardened SSL termination, and global static catalog caching through Cloudflare DNS.",
  },
  {
    step: "02",
    title: "Cart State",
    svgTitle: "Cart State",
    meta: "Next.js App Router",
    protocol: "RSC",
    metric: "0ms Optimistic",
    x: 242,
    detail:
      "Mobile-first storefront architecture with deterministic cart state, variant pricing, and zero layout shift.",
  },
  {
    step: "03",
    title: "Paystack / Stripe",
    svgTitle: "Checkout",
    meta: "Automated Checkout",
    protocol: "HMAC",
    metric: "Idempotent",
    x: 400,
    detail:
      "Paystack and Stripe checkout pipelines enforcing idempotency keys, server-side totals, and instant confirmation.",
  },
  {
    step: "04",
    title: "Order Webhook",
    svgTitle: "Order Webhook",
    meta: "Cloud DB & Dispatch",
    protocol: "ACID",
    metric: "99.98% Ack",
    x: 556,
    detail:
      "Signed webhook handlers committing verified payments to cloud inventory tables and triggering dispatch alerts.",
  },
] as const;

const LIVE_STOREFRONTS = [
  {
    domain: "blaireaesthetics.shop",
    href: "https://blaireaesthetics.shop",
    edge: "Cloudflare DNS · TLS 1.3",
  },
  {
    domain: "aifycycle.vercel.app",
    href: "https://aifycycle.vercel.app",
    edge: "Vercel Edge · App Router",
  },
] as const;

export function EcommerceSchematic({ compact = false }: SchematicProps) {
  const prefersReduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [activeStage, setActiveStage] = useState(2);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = COMMERCE_STAGES[activeStage];

  const shellClass = compact
    ? "w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--bg-canvas)] ring-1 ring-inset ring-[var(--border-hairline)]"
    : "w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-surface)]";

  return (
    <div className={shellClass}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 px-4 py-2.5 font-mono text-[11px]">
        <span className="flex items-center gap-2 font-semibold text-[var(--ink-primary)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[var(--accent)]"
          />
          EDGE COMMERCE DEPLOYMENT PIPELINE
        </span>
        <span className="font-medium tabular-nums text-[var(--status-positive)]">
          2 LIVE STOREFRONTS
        </span>
      </div>

      {/* Horizontal SVG Commerce Pipeline Diagram */}
      <div className="bg-[var(--bg-canvas)]/55 px-3 py-3">
        <svg
          viewBox="0 0 640 144"
          className="block h-auto w-full"
          role="img"
          aria-label="Horizontal commerce pipeline from Catalog Edge through Cart State and Paystack or Stripe Checkout to Order Webhook"
        >
          {/* Pipeline Track Connectors */}
          {[0, 1, 2].map((segIdx) => {
            const x1 = COMMERCE_STAGES[segIdx].x + 56;
            const x2 = COMMERCE_STAGES[segIdx + 1].x - 60;
            const isActiveSeg = segIdx < activeStage;
            const midX = (x1 + x2) / 2;

            return (
              <g key={segIdx}>
                <line
                  x1={x1}
                  y1={68}
                  x2={x2}
                  y2={68}
                  stroke={isActiveSeg ? "#1D4ED8" : "rgba(15, 20, 30, 0.16)"}
                  strokeWidth={isActiveSeg ? "2.2" : "1.5"}
                  strokeDasharray={isActiveSeg ? undefined : "3 3"}
                  style={{
                    transition: prefersReduced
                      ? "none"
                      : "stroke 200ms ease, stroke-width 200ms ease",
                  }}
                />
                <polygon
                  points={`${x2 - 2},64.5 ${x2 + 5},68 ${x2 - 2},71.5`}
                  fill={isActiveSeg ? "#1D4ED8" : "rgba(15, 20, 30, 0.28)"}
                />
                <text
                  x={midX}
                  y={58}
                  textAnchor="middle"
                  fill={isActiveSeg ? "#153AA2" : "#5B6475"}
                  fontSize="8"
                  fontWeight="600"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                >
                  {COMMERCE_STAGES[segIdx].protocol}
                </text>
              </g>
            );
          })}

          {/* 4 Interactive Pipeline Stage Nodes */}
          {COMMERCE_STAGES.map((stage, idx) => {
            const isReached = idx <= activeStage;
            const isSelected = idx === activeStage;
            const rectX = stage.x - 56;

            return (
              <g
                key={stage.step}
                onClick={compact ? undefined : () => setActiveStage(idx)}
                className={compact ? undefined : "cursor-pointer"}
              >
                {isSelected && (
                  <rect
                    x={rectX - 4}
                    y={30}
                    width="120"
                    height="76"
                    rx="12"
                    fill="rgba(29, 78, 216, 0.07)"
                    stroke="#1D4ED8"
                    strokeOpacity="0.55"
                    strokeWidth="1.25"
                  />
                )}
                <rect
                  x={rectX}
                  y={34}
                  width="112"
                  height="68"
                  rx="9"
                  fill={isSelected ? "#EEF3FF" : "#FFFFFF"}
                  stroke={
                    isSelected
                      ? "#1D4ED8"
                      : isReached
                        ? "rgba(29, 78, 216, 0.32)"
                        : "rgba(15, 20, 30, 0.12)"
                  }
                  strokeWidth={isSelected ? "1.6" : "1"}
                />

                <text
                  x={rectX + 10}
                  y={49}
                  fill={isReached ? "#153AA2" : "#5B6475"}
                  fontSize="8.5"
                  fontWeight="600"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                >
                  STAGE {stage.step}
                </text>
                <circle
                  cx={rectX + 100}
                  cy={46}
                  r="3"
                  fill={isReached ? "#136F3A" : "rgba(15, 20, 30, 0.16)"}
                />

                <text
                  x={stage.x}
                  y={70}
                  textAnchor="middle"
                  fill="#0F141E"
                  fontSize="10.2"
                  fontWeight="600"
                  fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
                >
                  {stage.svgTitle}
                </text>

                <text
                  x={stage.x}
                  y={88}
                  textAnchor="middle"
                  fill={isSelected ? "#153AA2" : "#5B6475"}
                  fontSize="8.3"
                  fontWeight="500"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                >
                  {stage.metric}
                </text>
              </g>
            );
          })}

          {/* Bottom Edge Verification Footnote */}
          <text
            x="28"
            y="130"
            fill="#5B6475"
            fontSize="8.5"
            fontFamily="var(--font-geist-mono), ui-monospace, monospace"
          >
            REQUEST LIFECYCLE · EDGE CACHE TO FULFILLMENT DB
          </text>
          <text
            x="612"
            y="130"
            textAnchor="end"
            fill="#136F3A"
            fontSize="8.5"
            fontWeight="600"
            fontFamily="var(--font-geist-mono), ui-monospace, monospace"
          >
            SSL HARDENED · WEBHOOK VERIFIED
          </text>
        </svg>
      </div>

      {/* Interactive Stage Selector, Telemetry Readout & Storefront Links (!compact) */}
      {!compact ? (
        <>
          <LayoutGroup id={`ecommerce-${uid}`}>
            <div
              role="tablist"
              aria-label="Inspect commerce deployment pipeline stages"
              className="grid grid-cols-2 gap-px border-t border-[var(--border-hairline)] bg-[var(--border-hairline)] sm:grid-cols-4"
            >
              {COMMERCE_STAGES.map((stage, idx) => {
                const isSelected = idx === activeStage;
                return (
                  <button
                    key={stage.step}
                    ref={(el) => {
                      tabRefs.current[idx] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveStage(idx)}
                    onKeyDown={(e) =>
                      handleTabListKeyDown(
                        e,
                        idx,
                        COMMERCE_STAGES.length,
                        setActiveStage,
                        tabRefs
                      )
                    }
                    className={`btn-press relative px-3.5 py-2.5 text-left ${
                      isSelected
                        ? "bg-[var(--accent-soft)] text-[var(--ink-primary)]"
                        : "bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="ecommerce-stage-bar"
                        transition={SPRING_TAB}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[var(--accent)]"
                      />
                    )}
                    <div className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                      <span
                        className={
                          isSelected
                            ? "font-semibold text-[var(--accent-deep)]"
                            : ""
                        }
                      >
                        STAGE {stage.step}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-[var(--ink-primary)]">
                      {stage.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                      {stage.meta}
                    </div>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/55 px-4 py-3">
            <BlurCrossfade contentKey={active.step}>
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
                <span className="font-semibold text-[var(--accent-deep)]">
                  STAGE {active.step} · {active.title.toUpperCase()} ({active.meta})
                </span>
                <span className="text-[var(--status-positive)]">
                  {active.protocol} · {active.metric}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-secondary)]">
                {active.detail}
              </p>
            </BlurCrossfade>
          </div>

          <div className="grid divide-y divide-[var(--border-hairline)] border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {LIVE_STOREFRONTS.map((store) => (
              <a
                key={store.domain}
                href={store.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-press group flex items-center justify-between gap-3 px-4 py-3 text-xs text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]/60 hover:text-[var(--accent-deep)]"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono font-semibold">
                    {store.domain}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                    {store.edge}
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-medium text-[var(--status-positive)]">
                  LIVE
                  <ArrowUpRight
                    size={13}
                    weight="bold"
                    className="hover-nudge-ne text-[var(--ink-secondary)] group-hover:text-[var(--accent-deep)]"
                  />
                </span>
              </a>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/55 px-4 py-2 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
          <span>CLOUDFLARE EDGE · PAYSTACK / STRIPE</span>
          <span className="font-medium text-[var(--status-positive)]">
            2 LIVE
          </span>
        </div>
      )}
    </div>
  );
}
