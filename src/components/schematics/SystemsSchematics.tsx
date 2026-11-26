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
import type { SchematicTheme } from "./ProjectSchematic";

interface SchematicProps {
  compact?: boolean;
  theme?: SchematicTheme;
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
/* 1. KORIDOR ENGINE OS: Geospatial Freight Corridor Topology                 */
/* -------------------------------------------------------------------------- */

const KORIDOR_STAGES = [
  {
    id: "origin",
    label: "Origin hub",
    coord: "6.45N 3.39E",
    tech: "GPS and WebSockets",
    metric: "12 Hz stream",
    x: 84,
    y: 98,
    labelOffset: -22,
    spec: "Live coordinate stream and vehicle status ingestion with heartbeat anomaly flags at dispatch origin.",
  },
  {
    id: "port",
    label: "Port clearance",
    coord: "6.21N 4.82E",
    tech: "Mapbox GL JS",
    metric: "Gate verified",
    x: 240,
    y: 58,
    labelOffset: -20,
    spec: "Geospatial haulage corridor map rendering active trucks, customs waypoints, and rolling ETA deltas.",
  },
  {
    id: "transit",
    label: "Transit telemetry",
    coord: "5.84N 6.14E",
    tech: "Google Gemini AI",
    metric: "Load matched",
    x: 400,
    y: 96,
    labelOffset: 28,
    spec: "Automated cargo-to-fleet matching scoring carrier capacity, route overlap, and dispatch priority in flight.",
  },
  {
    id: "delivery",
    label: "Final delivery",
    coord: "5.52N 7.49E",
    tech: "Supabase PostgreSQL",
    metric: "RLS ledger",
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

  return (
    <div ref={containerRef} className="w-full overflow-hidden bg-[var(--bg-surface)]">
      <div className="type-sm flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3">
        <span className="font-semibold text-[var(--ink-primary)]">
          Geospatial freight corridor topology
        </span>
        <span className="text-[var(--ink-muted)]">
          Next.js · Mapbox GL · Gemini AI
        </span>
      </div>

      <div className="bg-[var(--bg-canvas)]/55 px-3 py-3">
        <svg
          viewBox="0 0 640 174"
          className="block h-auto w-full"
          role="img"
          aria-label="Geospatial freight corridor topology from Origin hub through Port clearance and Transit telemetry to Final delivery"
        >
          {[84, 240, 400, 556].map((x, idx) => (
            <g key={x}>
              <line
                x1={x}
                y1={14}
                x2={x}
                y2={138}
                stroke="rgba(9, 19, 29, 0.05)"
                strokeWidth="1"
              />
              <line
                x1={x}
                y1={10}
                x2={x}
                y2={16}
                stroke="rgba(9, 19, 29, 0.18)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={165}
                textAnchor={idx === 0 ? "start" : idx === 3 ? "end" : "middle"}
                fill="#506376"
                fontSize="9"
                fontFamily="var(--font-mono), ui-monospace, monospace"
              >
                {KORIDOR_STAGES[idx].coord}
              </text>
            </g>
          ))}

          <path
            d="M 24 128 Q 160 88, 310 112 T 618 76"
            fill="none"
            stroke="rgba(9, 19, 29, 0.05)"
            strokeWidth="1"
          />
          <path
            d="M 24 44 Q 190 22, 354 52 T 618 32"
            fill="none"
            stroke="rgba(9, 19, 29, 0.045)"
            strokeWidth="1"
          />

          <path
            ref={fullSplineRef}
            d={KORIDOR_FULL_SPLINE}
            fill="none"
            stroke="rgba(9, 19, 29, 0.16)"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />

          {KORIDOR_SEGMENTS.map((segD, segIdx) => {
            const isActiveLeg = segIdx < selected;
            return (
              <path
                key={segIdx}
                d={segD}
                fill="none"
                stroke="#1456D1"
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

          <g ref={pulseRef} style={{ opacity: 0, pointerEvents: "none" }}>
            <circle cx={0} cy={0} r="8" fill="rgba(20, 86, 209, 0.18)" />
            <circle cx={0} cy={0} r="3.4" fill="#1456D1" />
          </g>

          {KORIDOR_STAGES.map((stage, idx) => {
            const isReached = idx <= selected;
            const isCurrent = idx === selected;
            const labelY = stage.y + stage.labelOffset;
            const codeY = stage.labelOffset < 0 ? labelY - 12 : labelY + 12;

            return (
              <g
                key={stage.id}
                onClick={compact ? undefined : () => setSelected(idx)}
                className={compact ? undefined : "cursor-pointer"}
              >
                {!compact && (
                  <circle cx={stage.x} cy={stage.y} r="18" fill="transparent" />
                )}

                {isCurrent && (
                  <circle
                    cx={stage.x}
                    cy={stage.y}
                    r="11.5"
                    fill="rgba(20, 86, 209, 0.1)"
                    stroke="#1456D1"
                    strokeOpacity="0.45"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                <circle
                  cx={stage.x}
                  cy={stage.y}
                  r={isCurrent ? "6.2" : "5"}
                  fill={isReached ? "#1456D1" : "#FFFFFF"}
                  stroke={isReached ? "#0E41A6" : "#506376"}
                  strokeWidth="1.75"
                />
                {isReached && (
                  <circle cx={stage.x} cy={stage.y} r="2" fill="#FFFFFF" />
                )}

                <text
                  x={stage.x}
                  y={labelY}
                  textAnchor="middle"
                  fill={isCurrent ? "#09131D" : "#344658"}
                  fontSize="10.5"
                  fontWeight={isCurrent ? "600" : "500"}
                  fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
                >
                  {stage.label}
                </text>
                <text
                  x={stage.x}
                  y={codeY}
                  textAnchor="middle"
                  fill={isCurrent ? "#0E41A6" : "#506376"}
                  fontSize="8.5"
                  fontWeight="500"
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                >
                  {stage.metric}
                </text>
              </g>
            );
          })}

          <rect
            x="84"
            y="147"
            width="472"
            height="3"
            rx="1.5"
            fill="rgba(9, 19, 29, 0.08)"
          />
          <rect
            x="84"
            y="147"
            width="472"
            height="3"
            rx="1.5"
            fill="#1456D1"
            style={{
              transform: `scaleX(${progress.toFixed(4)})`,
              transformOrigin: "84px 148.5px",
              transition: prefersReduced
                ? "none"
                : "transform 280ms var(--ease-out-expo)",
            }}
          />
        </svg>
      </div>

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
                    className={`btn-press relative px-4 py-3 text-left ${
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
                    <div className="type-sm font-semibold text-[var(--ink-primary)]">
                      {stage.label}
                    </div>
                    <div className="type-sm mt-0.5 text-[var(--ink-muted)]">
                      {stage.tech}
                    </div>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3.5">
            <BlurCrossfade contentKey={active.id}>
              <div className="type-sm flex flex-wrap items-baseline justify-between gap-2 tabular-nums">
                <span className="font-semibold text-[var(--ink-primary)]">
                  {active.label} ({active.coord})
                </span>
                <span className="font-medium text-[var(--status-positive)]">
                  {active.metric}
                </span>
              </div>
              <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                {active.spec}
              </p>
            </BlurCrossfade>
          </div>
        </>
      ) : (
        <div className="type-sm flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-2.5 tabular-nums text-[var(--ink-muted)]">
          <span>Four-stage haulage corridor</span>
          <span className="font-medium text-[var(--status-positive)]">
            RLS isolated
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
    label: "Model router",
    svgTitle: "Gemini / Gemma",
    svgSub: "Router",
    status: "Verified",
    x: 164,
    detail:
      "Routes complex planning to Gemini while offloading fast policy classification and schema verification to Gemma 2.",
  },
  {
    id: "memory",
    label: "Vector memory",
    svgTitle: "pgvector",
    svgSub: "Memory",
    status: "Indexed",
    x: 300,
    detail:
      "Retrieves historical institutional directives and prior audit logs via Supabase PostgreSQL pgvector cosine similarity.",
  },
  {
    id: "guardrail",
    label: "Tool guardrail",
    svgTitle: "Tool guardrail",
    svgSub: "Policy gate",
    status: "Enforced",
    x: 436,
    detail:
      "Intercepts outbound agent tool calls, validates schema and scope boundaries, and blocks unauthorized external mutations.",
  },
  {
    id: "cloudrun",
    label: "Cloud Run",
    svgTitle: "Cloud Run",
    svgSub: "Sandbox",
    status: "Isolated",
    x: 572,
    detail:
      "Stateless containerized execution boundary providing reproducible governance logs and elastic burst capacity.",
  },
] as const;

export function FortressSchematic({
  compact = false,
  theme = "light",
}: SchematicProps) {
  const prefersReduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [activeGate, setActiveGate] = useState(2);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isMarine = theme === "marine";

  const current = FORTRESS_GATES[activeGate];

  const accentStroke = isMarine ? "#66A3FF" : "#1456D1";
  const positiveFill = isMarine ? "#34D399" : "#0C6B4B";
  const mutedStroke = isMarine
    ? "rgba(244, 247, 250, 0.2)"
    : "rgba(9, 19, 29, 0.18)";
  const mutedText = isMarine ? "#92A6BC" : "#506376";
  const primaryText = isMarine ? "#F4F7FA" : "#09131D";

  return (
    <div
      className={`w-full overflow-hidden ${
        isMarine ? "bg-[var(--bg-marine-elevated)]" : "bg-[var(--bg-surface)]"
      }`}
    >
      <div
        className={`type-sm flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${
          isMarine
            ? "border-[var(--border-on-marine)] bg-[var(--bg-marine)] text-[var(--ink-on-marine)]"
            : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]"
        }`}
      >
        <span className="font-semibold">
          Multi-agent governance pipeline
        </span>
        <span
          className={
            isMarine
              ? "text-[var(--ink-on-marine-muted)]"
              : "text-[var(--ink-muted)]"
          }
        >
          Cloud Run · Supabase pgvector
        </span>
      </div>

      <div
        className={`px-3 py-4 ${
          isMarine ? "bg-[var(--bg-marine-elevated)]" : "bg-[var(--bg-canvas)]/55"
        }`}
      >
        <svg
          viewBox="0 0 640 162"
          className="block h-auto w-full"
          role="img"
          aria-label="Multi-agent governance pipeline from Prompt through Gemini and Gemma Router, pgvector Memory, Tool Guardrail, and Cloud Run Sandbox"
        >
          <g>
            <rect
              x="14"
              y="52"
              width="68"
              height="38"
              rx="8"
              fill={isMarine ? "#1456D1" : "#07111A"}
            />
            <text
              x="48"
              y="74"
              textAnchor="middle"
              fill="#F4F7FA"
              fontSize="10"
              fontWeight="600"
              fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
            >
              Prompt
            </text>
          </g>

          <path
            d="M 82 71 L 112 71"
            fill="none"
            stroke={accentStroke}
            strokeWidth="2"
          />
          <polygon points="110,67.5 117,71 110,74.5" fill={accentStroke} />

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
                  stroke={verified ? accentStroke : mutedStroke}
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
                  fill={verified ? accentStroke : mutedStroke}
                />
              </g>
            );
          })}

          <path
            d="M 164 102 L 164 134 L 572 134 L 572 102"
            fill="none"
            stroke={mutedStroke}
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
              stroke={mutedStroke}
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          ))}
          <text
            x="368"
            y="151"
            textAnchor="middle"
            fill={mutedText}
            fontSize="9"
            fontWeight="500"
            fontFamily="var(--font-mono), ui-monospace, monospace"
          >
            Immutable audit log · Zero unverified tool mutations
          </text>

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
                {isSelected && (
                  <rect
                    x={rectX - 4}
                    y={36}
                    width="104"
                    height="70"
                    rx="12"
                    fill={
                      isMarine
                        ? "rgba(102, 163, 255, 0.12)"
                        : "rgba(20, 86, 209, 0.08)"
                    }
                    stroke={accentStroke}
                    strokeOpacity="0.6"
                    strokeWidth="1.25"
                  />
                )}

                <rect
                  x={rectX}
                  y={40}
                  width="96"
                  height="62"
                  rx="9"
                  fill={
                    isMarine
                      ? isSelected
                        ? "#13273B"
                        : "#07111A"
                      : isSelected
                        ? "#EBF2FF"
                        : "#FFFFFF"
                  }
                  stroke={
                    isSelected
                      ? accentStroke
                      : isVerified
                        ? isMarine
                          ? "rgba(102, 163, 255, 0.42)"
                          : "rgba(20, 86, 209, 0.35)"
                        : mutedStroke
                  }
                  strokeWidth={isSelected ? "1.6" : "1.1"}
                />

                <circle
                  cx={rectX + 84}
                  cy={52}
                  r="3.2"
                  fill={isVerified ? positiveFill : mutedStroke}
                />

                <text
                  x={gate.x}
                  y={72}
                  textAnchor="middle"
                  fill={primaryText}
                  fontSize="10.5"
                  fontWeight="600"
                  fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
                >
                  {gate.svgTitle}
                </text>

                <text
                  x={gate.x}
                  y={89}
                  textAnchor="middle"
                  fill={isVerified ? positiveFill : mutedText}
                  fontSize="8.5"
                  fontWeight="500"
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                >
                  {isVerified ? gate.status : gate.svgSub}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {!compact ? (
        <>
          <LayoutGroup id={`fortress-${uid}`}>
            <div
              role="tablist"
              aria-label="Inspect Fortress governance checkpoint gates"
              className={`grid grid-cols-2 gap-px border-t sm:grid-cols-4 ${
                isMarine
                  ? "border-[var(--border-on-marine)] bg-[var(--border-on-marine)]"
                  : "border-[var(--border-hairline)] bg-[var(--border-hairline)]"
              }`}
            >
              {FORTRESS_GATES.map((gate, i) => {
                const isSelected = i === activeGate;
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
                    className={`btn-press relative px-4 py-3 text-left ${
                      isMarine
                        ? isSelected
                          ? "bg-[var(--bg-marine-subtle)] text-[var(--ink-on-marine)]"
                          : "bg-[var(--bg-marine)] text-[var(--ink-on-marine-secondary)] hover:bg-[var(--bg-marine-elevated)] hover:text-[var(--ink-on-marine)]"
                        : isSelected
                          ? "bg-[var(--accent-soft)] text-[var(--ink-primary)]"
                          : "bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="fortress-active-bar"
                        transition={SPRING_TAB}
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] ${
                          isMarine ? "bg-[var(--accent-bright)]" : "bg-[var(--accent)]"
                        }`}
                      />
                    )}
                    <div className="type-sm font-semibold">{gate.label}</div>
                    <div
                      className={`type-sm mt-0.5 ${
                        isMarine
                          ? "text-[var(--ink-on-marine-muted)]"
                          : "text-[var(--ink-muted)]"
                      }`}
                    >
                      {gate.status}
                    </div>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div
            className={`border-t px-4 py-3.5 ${
              isMarine
                ? "border-[var(--border-on-marine)] bg-[var(--bg-marine)]"
                : "border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
            }`}
          >
            <BlurCrossfade contentKey={current.id}>
              <div className="type-sm flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`font-semibold ${
                    isMarine
                      ? "text-[var(--ink-on-marine)]"
                      : "text-[var(--ink-primary)]"
                  }`}
                >
                  {current.label} checkpoint
                </span>
                <span
                  className={`font-medium ${
                    isMarine
                      ? "text-[var(--status-positive-bright)]"
                      : "text-[var(--status-positive)]"
                  }`}
                >
                  {current.status} · Policy pass
                </span>
              </div>
              <p
                className={`type-sm mt-1.5 ${
                  isMarine
                    ? "text-[var(--ink-on-marine-secondary)]"
                    : "text-[var(--ink-secondary)]"
                }`}
              >
                {current.detail}
              </p>
            </BlurCrossfade>
          </div>
        </>
      ) : (
        <div
          className={`type-sm flex items-center justify-between border-t px-4 py-2.5 ${
            isMarine
              ? "border-[var(--border-on-marine)] bg-[var(--bg-marine)] text-[var(--ink-on-marine-muted)]"
              : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--ink-muted)]"
          }`}
        >
          <span>Four verification checkpoints</span>
          <span
            className={`font-medium ${
              isMarine
                ? "text-[var(--status-positive-bright)]"
                : "text-[var(--status-positive)]"
            }`}
          >
            Policy enforced
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
  { value: "24H", label: "24h" },
  { value: "7D", label: "7d" },
  { value: "30D", label: "30d" },
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
    feedLatency: "38 ms WS",
  },
  "7D": {
    points: [96.2, 97.5, 97.1, 98.9, 100.4, 99.8, 102.3, 103.6, 104.8],
    timestamps: [
      "Day 1",
      "Day 2",
      "Day 3",
      "Day 4",
      "Day 5",
      "Day 6",
      "Day 7",
      "Day 8",
      "Now",
    ],
    delta: "+8.94%",
    apy: "6.42% APR",
    feedLatency: "41 ms WS",
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
      "Now",
    ],
    delta: "+20.00%",
    apy: "6.45% APR",
    feedLatency: "39 ms WS",
  },
};

const CRYPTO_SVG_W = 600;
const CRYPTO_PAD_L = 46;
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

  const svgH = compact ? 148 : 196;
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
      const tipW = tooltipRef.current.offsetWidth || 210;
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

  return (
    <div className="w-full overflow-hidden bg-[var(--bg-surface)]">
      <div className="type-sm flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3">
        <span className="font-semibold text-[var(--ink-primary)]">
          WebSocket ticker and yield ledger
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
            className="type-sm pointer-events-none absolute top-0 left-0 z-10 rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1 font-medium whitespace-nowrap tabular-nums text-[var(--ink-primary)] shadow-[var(--shadow-surface)]"
          />
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${CRYPTO_SVG_W} ${svgH}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Smooth monotone SVG portfolio NAV chart with cerulean area gradient"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1456D1" stopOpacity="0.18" />
              <stop offset="75%" stopColor="#1456D1" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#1456D1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {computed.ticks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={CRYPTO_PAD_L}
                y1={tick.y}
                x2={CRYPTO_SVG_W - CRYPTO_PAD_R}
                y2={tick.y}
                stroke="rgba(9, 19, 29, 0.075)"
                strokeWidth="1"
              />
              <text
                x={CRYPTO_PAD_L - 8}
                y={tick.y + 3.5}
                textAnchor="end"
                fill="#506376"
                fontSize="9.5"
                fontFamily="var(--font-mono), ui-monospace, monospace"
              >
                {tick.val.toFixed(1)}
              </text>
            </g>
          ))}

          {[0, 2, 4, 6, 8].map((stepIdx) => (
            <text
              key={stepIdx}
              x={xs[stepIdx]}
              y={svgH - 6}
              textAnchor={
                stepIdx === 0 ? "start" : stepIdx === 8 ? "end" : "middle"
              }
              fill="#506376"
              fontSize="9"
              fontFamily="var(--font-mono), ui-monospace, monospace"
            >
              {current.timestamps[stepIdx]}
            </text>
          ))}

          <path
            ref={areaPathRef}
            d={buildMonotoneAreaPath(xs, initialYs, plotBottom)}
            fill={`url(#${gradId})`}
          />

          <path
            ref={linePathRef}
            d={buildMonotoneCubicPath(xs, initialYs)}
            fill="none"
            stroke="#1456D1"
            strokeWidth="2.35"
            strokeLinecap="round"
          />

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
                fill={isTerminal ? "#1456D1" : "#FFFFFF"}
                stroke="#1456D1"
                strokeWidth={isTerminal ? "1.6" : "1.25"}
              />
            );
          })}

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
                  stroke="#1456D1"
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
                <circle cx={0} cy={0} r="7" fill="rgba(20, 86, 209, 0.16)" />
                <circle
                  cx={0}
                  cy={0}
                  r="3.6"
                  fill="#1456D1"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                />
              </g>
            </>
          )}
        </svg>
      </div>

      <div className="type-sm grid grid-cols-3 divide-x divide-[var(--border-hairline)] border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] tabular-nums">
        <div className="px-3.5 py-2.5">
          <div className="text-[var(--ink-muted)]">Index delta</div>
          <div className="mt-0.5 font-semibold text-[var(--status-positive)]">
            <BlurCrossfade inline contentKey={`${period}-delta`}>
              {current.delta}
            </BlurCrossfade>
          </div>
        </div>
        <div className="px-3.5 py-2.5">
          <div className="text-[var(--ink-muted)]">Yield accrual</div>
          <div className="mt-0.5 font-semibold text-[var(--ink-primary)]">
            <BlurCrossfade inline contentKey={`${period}-apy`}>
              {current.apy}
            </BlurCrossfade>
          </div>
        </div>
        <div className="px-3.5 py-2.5">
          <div className="text-[var(--ink-muted)]">Ticker latency</div>
          <div className="mt-0.5 font-semibold text-[var(--accent-deep)]">
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
/* 4. STITCH RETAIL OPERATIONS OS: Hub-and-Spoke Sync Ledger                  */
/* -------------------------------------------------------------------------- */

const STITCH_BRANCHES = [
  {
    id: "central",
    name: "Central branch",
    skus: "1,420 active SKUs",
    shortCount: "1,420 SKUs",
    posSync: "Reconciled",
    variance: "0.00%",
    restock: "4 supplier POs queued",
    y: 34,
  },
  {
    id: "express",
    name: "Express branch",
    skus: "890 active SKUs",
    shortCount: "890 SKUs",
    posSync: "Reconciled",
    variance: "0.00%",
    restock: "2 transfers pending",
    y: 84,
  },
  {
    id: "supplier",
    name: "Supplier hub",
    skus: "18 active vendors",
    shortCount: "18 vendors",
    posSync: "Invoice matched",
    variance: "Verified",
    restock: "Auto-ledger synced",
    y: 134,
  },
] as const;

export function StitchRetailSchematic({ compact = false }: SchematicProps) {
  const prefersReduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [branchIdx, setBranchIdx] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = STITCH_BRANCHES[branchIdx];

  return (
    <div className="w-full overflow-hidden bg-[var(--bg-surface)]">
      <div className="type-sm flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3">
        <span className="font-semibold text-[var(--ink-primary)]">
          Multi-branch inventory and POS sync
        </span>
        <span className="font-medium text-[var(--accent-deep)]">
          Google Stitch Loop
        </span>
      </div>

      <div className="bg-[var(--bg-canvas)]/55 px-3 py-3">
        <svg
          viewBox="0 0 640 168"
          className="block h-auto w-full"
          role="img"
          aria-label="Multi-branch hub-and-spoke synchronization diagram connecting Central branch, Express branch, and Supplier hub into a Central PostgreSQL Reconciliation Core"
        >
          {STITCH_BRANCHES.map((branch, idx) => {
            const isActive = idx === branchIdx;
            const pathD = `M 228 ${branch.y} L 298 ${branch.y} L 298 84 L 366 84`;
            return (
              <g key={branch.id}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={isActive ? "#1456D1" : "rgba(9, 19, 29, 0.16)"}
                  strokeWidth={isActive ? "2.2" : "1.35"}
                  strokeDasharray={isActive ? undefined : "3 3"}
                  strokeLinejoin="round"
                  style={{
                    transition: prefersReduced
                      ? "none"
                      : "stroke 200ms ease, stroke-width 200ms ease",
                  }}
                />
                <circle
                  cx="228"
                  cy={branch.y}
                  r={isActive ? "3.5" : "2.6"}
                  fill={isActive ? "#1456D1" : "#FFFFFF"}
                  stroke={isActive ? "#0E41A6" : "rgba(9, 19, 29, 0.28)"}
                  strokeWidth="1.4"
                />
              </g>
            );
          })}

          <polygon points="362,80 370,84 362,88" fill="#1456D1" />
          <circle
            cx="298"
            cy="84"
            r="4"
            fill="#1456D1"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />

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
                  fill={isActive ? "#EBF2FF" : "#FFFFFF"}
                  stroke={isActive ? "#1456D1" : "rgba(9, 19, 29, 0.12)"}
                  strokeWidth={isActive ? "1.5" : "1"}
                />
                <circle cx="32" cy={branch.y} r="3.2" fill="#0C6B4B" />
                <text
                  x="44"
                  y={branch.y - 2.5}
                  fill="#09131D"
                  fontSize="10.5"
                  fontWeight="600"
                  fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
                >
                  {branch.name}
                </text>
                <text
                  x="44"
                  y={branch.y + 10.5}
                  fill={isActive ? "#0E41A6" : "#506376"}
                  fontSize="8.5"
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                >
                  {branch.shortCount} · {branch.posSync}
                </text>
              </g>
            );
          })}

          <g>
            <rect
              x="372"
              y="24"
              width="248"
              height="120"
              rx="12"
              fill="#FFFFFF"
              stroke="rgba(20, 86, 209, 0.28)"
              strokeWidth="1.25"
            />
            <rect
              x="372"
              y="24"
              width="248"
              height="30"
              rx="12"
              fill="#EFF4F9"
            />
            <rect x="372" y="42" width="248" height="12" fill="#EFF4F9" />
            <line
              x1="372"
              y1="54"
              x2="620"
              y2="54"
              stroke="rgba(9, 19, 29, 0.08)"
              strokeWidth="1"
            />

            <text
              x="388"
              y="43"
              fill="#09131D"
              fontSize="10.5"
              fontWeight="600"
              fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
            >
              PostgreSQL ledger core
            </text>

            <text
              x="388"
              y="76"
              fill="#506376"
              fontSize="9.5"
              fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
            >
              Active spoke
            </text>
            <text
              x="604"
              y="76"
              textAnchor="end"
              fill="#0E41A6"
              fontSize="9"
              fontWeight="600"
              fontFamily="var(--font-mono), ui-monospace, monospace"
            >
              {current.shortCount}
            </text>

            <line
              x1="388"
              y1="88"
              x2="604"
              y2="88"
              stroke="rgba(9, 19, 29, 0.07)"
              strokeWidth="1"
            />

            <text
              x="388"
              y="106"
              fill="#506376"
              fontSize="9.5"
              fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
            >
              POS variance
            </text>
            <text
              x="604"
              y="106"
              textAnchor="end"
              fill="#0C6B4B"
              fontSize="9.5"
              fontWeight="600"
              fontFamily="var(--font-mono), ui-monospace, monospace"
            >
              {current.variance}
            </text>

            <line
              x1="388"
              y1="118"
              x2="604"
              y2="118"
              stroke="rgba(9, 19, 29, 0.07)"
              strokeWidth="1"
            />

            <text
              x="388"
              y="134"
              fill="#506376"
              fontSize="9.5"
              fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
            >
              Integrity
            </text>
            <text
              x="604"
              y="134"
              textAnchor="end"
              fill="#09131D"
              fontSize="9"
              fontWeight="600"
              fontFamily="var(--font-mono), ui-monospace, monospace"
            >
              ACID reconciled
            </text>
          </g>
        </svg>
      </div>

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
                    className={`btn-press relative px-4 py-3 text-left ${
                      active
                        ? "bg-[var(--accent-soft)]/70 text-[var(--ink-primary)]"
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
                    <div className="type-sm truncate font-semibold text-[var(--ink-primary)]">
                      {branch.name}
                    </div>
                    <div className="type-sm mt-0.5 tabular-nums text-[var(--ink-muted)]">
                      {branch.skus}
                    </div>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
            <BlurCrossfade contentKey={current.id}>
              <div className="type-sm grid grid-cols-3 divide-x divide-[var(--border-hairline)] tabular-nums">
                <div className="px-4 py-3">
                  <div className="text-[var(--ink-muted)]">POS variance</div>
                  <div className="mt-0.5 font-semibold text-[var(--status-positive)]">
                    {current.variance}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[var(--ink-muted)]">Workflow</div>
                  <div className="mt-0.5 font-semibold text-[var(--ink-primary)]">
                    {current.restock}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[var(--ink-muted)]">Audit trail</div>
                  <div className="mt-0.5 font-semibold text-[var(--accent-deep)]">
                    PostgreSQL ledger
                  </div>
                </div>
              </div>
            </BlurCrossfade>
          </div>
        </>
      ) : (
        <div className="type-sm grid grid-cols-3 divide-x divide-[var(--border-hairline)] border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] tabular-nums">
          <div className="px-3.5 py-2.5">
            <span className="text-[var(--ink-muted)]">SKUs </span>
            <span className="font-semibold text-[var(--ink-primary)]">
              2,310
            </span>
          </div>
          <div className="px-3.5 py-2.5">
            <span className="text-[var(--ink-muted)]">Variance </span>
            <span className="font-semibold text-[var(--status-positive)]">
              0.00%
            </span>
          </div>
          <div className="px-3.5 py-2.5 text-right font-medium text-[var(--accent-deep)]">
            Reconciled
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. PRODUCTION E-COMMERCE BUILDS: Horizontal Commerce Pipeline              */
/* -------------------------------------------------------------------------- */

const COMMERCE_STAGES = [
  {
    id: "edge",
    title: "Catalog edge",
    meta: "Cloudflare DNS and TLS",
    protocol: "TLS 1.3",
    metric: "14 ms TTFB",
    x: 84,
    detail:
      "Custom domain routing, hardened SSL termination, and global static catalog caching through Cloudflare DNS.",
  },
  {
    id: "cart",
    title: "Cart state",
    meta: "Next.js App Router",
    protocol: "RSC",
    metric: "Optimistic",
    x: 242,
    detail:
      "Mobile-first storefront architecture with deterministic cart state, variant pricing, and zero layout shift.",
  },
  {
    id: "checkout",
    title: "Checkout",
    meta: "Paystack and Stripe",
    protocol: "HMAC",
    metric: "Idempotent",
    x: 400,
    detail:
      "Paystack and Stripe checkout pipelines enforcing idempotency keys, server-side totals, and instant confirmation.",
  },
  {
    id: "webhook",
    title: "Order webhook",
    meta: "Cloud DB and dispatch",
    protocol: "ACID",
    metric: "99.98% ack",
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

  return (
    <div className="w-full overflow-hidden bg-[var(--bg-surface)]">
      <div className="type-sm flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3">
        <span className="font-semibold text-[var(--ink-primary)]">
          Edge commerce deployment pipeline
        </span>
        <span className="font-medium tabular-nums text-[var(--status-positive)]">
          2 live storefronts
        </span>
      </div>

      <div className="bg-[var(--bg-canvas)]/55 px-3 py-3">
        <svg
          viewBox="0 0 640 144"
          className="block h-auto w-full"
          role="img"
          aria-label="Horizontal commerce pipeline from Catalog edge through Cart state and Checkout to Order webhook"
        >
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
                  stroke={isActiveSeg ? "#1456D1" : "rgba(9, 19, 29, 0.16)"}
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
                  fill={isActiveSeg ? "#1456D1" : "rgba(9, 19, 29, 0.28)"}
                />
                <text
                  x={midX}
                  y={58}
                  textAnchor="middle"
                  fill={isActiveSeg ? "#0E41A6" : "#506376"}
                  fontSize="8"
                  fontWeight="600"
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                >
                  {COMMERCE_STAGES[segIdx].protocol}
                </text>
              </g>
            );
          })}

          {COMMERCE_STAGES.map((stage, idx) => {
            const isReached = idx <= activeStage;
            const isSelected = idx === activeStage;
            const rectX = stage.x - 56;

            return (
              <g
                key={stage.id}
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
                    fill="rgba(20, 86, 209, 0.08)"
                    stroke="#1456D1"
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
                  fill={isSelected ? "#EBF2FF" : "#FFFFFF"}
                  stroke={
                    isSelected
                      ? "#1456D1"
                      : isReached
                        ? "rgba(20, 86, 209, 0.32)"
                        : "rgba(9, 19, 29, 0.12)"
                  }
                  strokeWidth={isSelected ? "1.6" : "1"}
                />

                <circle
                  cx={rectX + 98}
                  cy={47}
                  r="3"
                  fill={isReached ? "#0C6B4B" : "rgba(9, 19, 29, 0.16)"}
                />

                <text
                  x={stage.x}
                  y={68}
                  textAnchor="middle"
                  fill="#09131D"
                  fontSize="10.5"
                  fontWeight="600"
                  fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
                >
                  {stage.title}
                </text>

                <text
                  x={stage.x}
                  y={87}
                  textAnchor="middle"
                  fill={isSelected ? "#0E41A6" : "#506376"}
                  fontSize="8.5"
                  fontWeight="500"
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                >
                  {stage.metric}
                </text>
              </g>
            );
          })}

          <text
            x="28"
            y="130"
            fill="#506376"
            fontSize="9"
            fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
          >
            Request lifecycle from edge cache to fulfillment database
          </text>
          <text
            x="612"
            y="130"
            textAnchor="end"
            fill="#0C6B4B"
            fontSize="8.5"
            fontWeight="600"
            fontFamily="var(--font-mono), ui-monospace, monospace"
          >
            SSL hardened · Webhook verified
          </text>
        </svg>
      </div>

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
                    key={stage.id}
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
                    className={`btn-press relative px-4 py-3 text-left ${
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
                    <div className="type-sm font-semibold text-[var(--ink-primary)]">
                      {stage.title}
                    </div>
                    <div className="type-sm mt-0.5 text-[var(--ink-muted)]">
                      {stage.meta}
                    </div>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3.5">
            <BlurCrossfade contentKey={active.id}>
              <div className="type-sm flex flex-wrap items-center justify-between gap-2 tabular-nums">
                <span className="font-semibold text-[var(--ink-primary)]">
                  {active.title} ({active.meta})
                </span>
                <span className="font-medium text-[var(--status-positive)]">
                  {active.protocol} · {active.metric}
                </span>
              </div>
              <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
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
                className="type-sm btn-press group flex items-center justify-between gap-3 px-4 py-3 text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]/60 hover:text-[var(--accent-deep)]"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{store.domain}</div>
                  <div className="mt-0.5 text-[var(--ink-muted)]">
                    {store.edge}
                  </div>
                </div>
                <ArrowUpRight
                  size={15}
                  weight="bold"
                  className="hover-nudge-ne shrink-0 text-[var(--ink-secondary)] group-hover:text-[var(--accent-deep)]"
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
        </>
      ) : (
        <div className="type-sm flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-2.5 tabular-nums text-[var(--ink-muted)]">
          <span>Cloudflare edge · Paystack and Stripe</span>
          <span className="font-medium text-[var(--status-positive)]">
            2 storefronts live
          </span>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  7. G-GRAVITATOR — FOUR-UNIT OPERATING FLYWHEEL & ORBITAL WIRE SCHEMATIC  */
/* ========================================================================== */

interface GravitatorUnit {
  id: string;
  code: string;
  title: string;
  route: string;
  metric: string;
  status: string;
  detail: string;
  x: number;
  y: number;
}

const GRAVITATOR_UNITS: GravitatorUnit[] = [
  {
    id: "systems",
    code: "UNIT-01",
    title: "G-Gravitator Systems",
    route: "/systems",
    metric: "5d Audit · 4w MVP",
    status: "Active B2B",
    detail:
      "Enterprise AI foundry delivering 5-day Gravity Audits, 4-week Velocity MVPs, and monthly Lab Retainers with 100% foreground IP transfer, funding Labs drops without dilution.",
    x: 112,
    y: 44,
  },
  {
    id: "skunkworks",
    code: "UNIT-02",
    title: "OXAKALABS Skunkworks",
    route: "/skunkworks",
    metric: "48h Sprints · 13+ Events",
    status: "Live Radar",
    detail:
      "48-hour experimental R&D arm and cross-source Hackathon Radar tracking Devpost, DoraHacks, Lablab.ai, MLH, X, and Luma to stress-test frontier models under time compression.",
    x: 528,
    y: 44,
  },
  {
    id: "labs",
    code: "UNIT-03",
    title: "G-Gravitator Labs",
    route: "/labs",
    metric: "G-01..G-04 · 23/25",
    status: "Graduated",
    detail:
      "Proprietary software & AI drops promoted via the 25-point Graduation Scorecard: Gravity Deck (G-01), OpsPilot (G-02), Kinetic Studio (G-03), and OrbitBench (G-04).",
    x: 528,
    y: 132,
  },
  {
    id: "orbit",
    code: "UNIT-04",
    title: "G-Gravitator Orbit",
    route: "/orbit",
    metric: "6-Week Residency",
    status: "Cycle 01",
    detail:
      "Selective builders cohort training Applied AI, Product Systems, and Kinetic Design engineers alongside Systems principals and OXAKALABS squads through Demo Day.",
    x: 112,
    y: 132,
  },
];

const GRAVITATOR_LINKS = [
  {
    domain: "ggravitator.xyz",
    href: "https://ggravitator.xyz",
    note: "Four-unit lab HQ · Command-K",
  },
  {
    domain: "ggravitator.xyz/journal",
    href: "https://www.ggravitator.xyz/journal",
    note: "12 Dispatches · Gemini 2.5 Flash Wire",
  },
] as const;

export function GGravitatorSchematic({ compact = false }: SchematicProps) {
  const uid = useId();
  const prefersReduced = useReducedMotion();
  const [activeUnit, setActiveUnit] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = GRAVITATOR_UNITS[activeUnit];

  return (
    <div className="flex flex-col overflow-hidden bg-[var(--bg-surface)]">
      <div className="type-sm flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-2.5">
        <span className="font-semibold text-[var(--ink-primary)]">
          Four-unit operating flywheel and Orbital Wire
        </span>
        <span className="type-meta text-[var(--ink-muted)]">
          Next.js · Gemini 2.5 Flash · Zod
        </span>
      </div>

      <div className="relative bg-[var(--bg-surface)] px-3 pt-4 pb-3 sm:px-5">
        <svg
          viewBox="0 0 640 176"
          className="h-auto w-full select-none"
          role="img"
          aria-label="G-Gravitator four-unit flywheel connecting Systems, OXAKALABS Skunkworks, Labs G-01 through G-04 drops, and Orbit around The Orbital Wire Gemini 2.5 Flash core"
        >
          {/* Subtle Orbital Field Rings */}
          <ellipse
            cx="320"
            cy="88"
            rx="168"
            ry="58"
            fill="none"
            stroke="rgba(9, 19, 29, 0.065)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <circle
            cx="320"
            cy="88"
            r="46"
            fill="rgba(20, 86, 209, 0.045)"
            stroke="rgba(20, 86, 209, 0.24)"
            strokeWidth="1.2"
          />

          {/* Closed-Loop Flywheel Perimeter Vectors */}
          {/* Top: Systems -> Skunkworks */}
          <line
            x1="204"
            y1="44"
            x2="432"
            y2="44"
            stroke={activeUnit === 0 ? "#1456D1" : "rgba(9, 19, 29, 0.16)"}
            strokeWidth={activeUnit === 0 ? "2" : "1.25"}
            strokeDasharray={activeUnit === 0 ? undefined : "3 3"}
            style={{
              transition: prefersReduced ? "none" : "stroke 200ms ease",
            }}
          />
          <polygon
            points="430,40.5 436,44 430,47.5"
            fill={activeUnit === 0 ? "#1456D1" : "rgba(9, 19, 29, 0.28)"}
          />

          {/* Right: Skunkworks -> Labs */}
          <line
            x1="528"
            y1="72"
            x2="528"
            y2="100"
            stroke={activeUnit === 1 ? "#1456D1" : "rgba(9, 19, 29, 0.16)"}
            strokeWidth={activeUnit === 1 ? "2" : "1.25"}
            strokeDasharray={activeUnit === 1 ? undefined : "3 3"}
            style={{
              transition: prefersReduced ? "none" : "stroke 200ms ease",
            }}
          />
          <polygon
            points="524.5,98 528,104 531.5,98"
            fill={activeUnit === 1 ? "#1456D1" : "rgba(9, 19, 29, 0.28)"}
          />

          {/* Bottom: Labs -> Orbit */}
          <line
            x1="436"
            y1="132"
            x2="208"
            y2="132"
            stroke={activeUnit === 2 ? "#1456D1" : "rgba(9, 19, 29, 0.16)"}
            strokeWidth={activeUnit === 2 ? "2" : "1.25"}
            strokeDasharray={activeUnit === 2 ? undefined : "3 3"}
            style={{
              transition: prefersReduced ? "none" : "stroke 200ms ease",
            }}
          />
          <polygon
            points="210,128.5 204,132 210,135.5"
            fill={activeUnit === 2 ? "#1456D1" : "rgba(9, 19, 29, 0.28)"}
          />

          {/* Left: Orbit -> Systems */}
          <line
            x1="112"
            y1="104"
            x2="112"
            y2="76"
            stroke={activeUnit === 3 ? "#1456D1" : "rgba(9, 19, 29, 0.16)"}
            strokeWidth={activeUnit === 3 ? "2" : "1.25"}
            strokeDasharray={activeUnit === 3 ? undefined : "3 3"}
            style={{
              transition: prefersReduced ? "none" : "stroke 200ms ease",
            }}
          />
          <polygon
            points="108.5,78 112,72 115.5,78"
            fill={activeUnit === 3 ? "#1456D1" : "rgba(9, 19, 29, 0.28)"}
          />

          {/* Radial Telemetry Spokes into Central Orbital Wire Core */}
          {GRAVITATOR_UNITS.map((unit, idx) => {
            const isActive = idx === activeUnit;
            const startX = unit.x < 320 ? unit.x + 90 : unit.x - 90;
            const endX = unit.x < 320 ? 278 : 362;
            const endY = unit.y < 88 ? 72 : 104;
            return (
              <line
                key={`spoke-${unit.id}`}
                x1={startX}
                y1={unit.y}
                x2={endX}
                y2={endY}
                stroke={isActive ? "#1456D1" : "rgba(9, 19, 29, 0.1)"}
                strokeWidth={isActive ? "1.75" : "1"}
                strokeDasharray={isActive ? undefined : "2.5 2.5"}
                style={{
                  transition: prefersReduced ? "none" : "stroke 200ms ease",
                }}
              />
            );
          })}

          {/* Central Intelligence Hub: Orbital Wire */}
          <g>
            <circle
              cx="320"
              cy="88"
              r="38"
              fill="#07111A"
              stroke="#1456D1"
              strokeWidth="1.5"
            />
            <text
              x="320"
              y="83"
              textAnchor="middle"
              fill="#F4F7FA"
              fontSize="9.5"
              fontWeight="600"
              fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
            >
              Orbital Wire
            </text>
            <text
              x="320"
              y="97"
              textAnchor="middle"
              fill="#66A3FF"
              fontSize="8"
              fontWeight="500"
              fontFamily="var(--font-mono), ui-monospace, monospace"
            >
              &lt;200ms FSM
            </text>
          </g>

          {/* Four Interlocking Unit Cards */}
          {GRAVITATOR_UNITS.map((unit, idx) => {
            const isSelected = idx === activeUnit;
            const rectX = unit.x - 92;
            const rectY = unit.y - 26;
            return (
              <g
                key={unit.id}
                onClick={compact ? undefined : () => setActiveUnit(idx)}
                className={compact ? undefined : "cursor-pointer"}
              >
                {isSelected && (
                  <rect
                    x={rectX - 3.5}
                    y={rectY - 3.5}
                    width="191"
                    height="59"
                    rx="11"
                    fill="rgba(20, 86, 209, 0.08)"
                    stroke="#1456D1"
                    strokeOpacity="0.55"
                    strokeWidth="1.2"
                  />
                )}
                <rect
                  x={rectX}
                  y={rectY}
                  width="184"
                  height="52"
                  rx="8"
                  fill={isSelected ? "#EBF2FF" : "#FFFFFF"}
                  stroke={isSelected ? "#1456D1" : "rgba(9, 19, 29, 0.14)"}
                  strokeWidth={isSelected ? "1.5" : "1"}
                />
                <circle
                  cx={rectX + 14}
                  cy={rectY + 18}
                  r="3"
                  fill={isSelected ? "#1456D1" : "#0C6B4B"}
                />
                <text
                  x={rectX + 24}
                  y={rectY + 21.5}
                  fill="#09131D"
                  fontSize="10.2"
                  fontWeight="600"
                  fontFamily="var(--font-body), ui-sans-serif, system-ui, sans-serif"
                >
                  {unit.title}
                </text>
                <text
                  x={rectX + 24}
                  y={rectY + 38}
                  fill={isSelected ? "#0E41A6" : "#506376"}
                  fontSize="8.5"
                  fontWeight="500"
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                >
                  {unit.metric}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {!compact ? (
        <>
          <LayoutGroup id={`gravitator-${uid}`}>
            <div
              role="tablist"
              aria-label="Inspect G-Gravitator operating flywheel divisions"
              className="grid grid-cols-2 divide-x divide-y divide-[var(--border-hairline)] border-t border-[var(--border-hairline)] sm:grid-cols-4 sm:divide-y-0"
            >
              {GRAVITATOR_UNITS.map((unit, idx) => {
                const isSelected = idx === activeUnit;
                return (
                  <button
                    key={unit.id}
                    ref={(el) => {
                      tabRefs.current[idx] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveUnit(idx)}
                    onKeyDown={(e) =>
                      handleTabListKeyDown(
                        e,
                        idx,
                        GRAVITATOR_UNITS.length,
                        setActiveUnit,
                        tabRefs
                      )
                    }
                    className={`btn-press relative px-4 py-3 text-left ${
                      isSelected
                        ? "bg-[var(--accent-soft)] text-[var(--ink-primary)]"
                        : "bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="gravitator-unit-bar"
                        transition={SPRING_TAB}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[var(--accent)]"
                      />
                    )}
                    <div className="type-sm font-semibold text-[var(--ink-primary)]">
                      {unit.title.replace("G-Gravitator ", "").replace("OXAKALABS ", "")}
                    </div>
                    <div className="type-meta mt-0.5 text-[var(--ink-muted)]">
                      {unit.route}
                    </div>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3.5">
            <BlurCrossfade contentKey={current.id}>
              <div className="type-sm flex flex-wrap items-center justify-between gap-2 tabular-nums">
                <span className="font-semibold text-[var(--ink-primary)]">
                  {current.title} ({current.route})
                </span>
                <span className="type-meta font-medium text-[var(--status-positive)]">
                  {current.status} · {current.metric}
                </span>
              </div>
              <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                {current.detail}
              </p>
            </BlurCrossfade>
          </div>

          <div className="grid divide-y divide-[var(--border-hairline)] border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {GRAVITATOR_LINKS.map((item) => (
              <a
                key={item.domain}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="type-sm btn-press group flex items-center justify-between gap-3 px-4 py-3 text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]/60 hover:text-[var(--accent-deep)]"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{item.domain}</div>
                  <div className="type-meta mt-0.5 text-[var(--ink-muted)]">
                    {item.note}
                  </div>
                </div>
                <ArrowUpRight
                  size={15}
                  weight="bold"
                  className="hover-nudge-ne shrink-0 text-[var(--ink-secondary)] group-hover:text-[var(--accent-deep)]"
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
        </>
      ) : (
        <div className="type-sm flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-2.5 tabular-nums text-[var(--ink-muted)]">
          <span>Systems · Skunkworks · Labs · Orbit</span>
          <span className="type-meta font-medium text-[var(--status-positive)]">
            ggravitator.xyz live
          </span>
        </div>
      )}
    </div>
  );
}
