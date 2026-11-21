"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useReducedMotion } from "framer-motion";
import {
  BlurCrossfade,
  ClipSegmentedTabs,
  type SegmentedTabOption,
} from "@/components/ui/MotionPrimitives";

interface QuantMonteCarloSchematicProps {
  compact?: boolean;
}

type RiskOption = "0.5" | "1.0" | "2.0";
type WinRateOption = "45" | "55" | "65";

const RISK_OPTIONS: ReadonlyArray<SegmentedTabOption<RiskOption>> = [
  { value: "0.5", label: "0.5%" },
  { value: "1.0", label: "1.0%" },
  { value: "2.0", label: "2.0%" },
];

const WINRATE_OPTIONS: ReadonlyArray<SegmentedTabOption<WinRateOption>> = [
  { value: "45", label: "45%" },
  { value: "55", label: "55%" },
  { value: "65", label: "65%" },
];

const REFERENCE_TICKS = [90, 100, 110, 120] as const;
const TRADES = 40;
const NUM_PATHS = 12;
const REWARD_TO_RISK = 1.8;
const MORPH_DURATION_MS = 280;

const SVG_WIDTH = 600;
const PAD_LEFT = 46;
const PAD_RIGHT = 18;
const PAD_TOP = 20;
const PAD_BOTTOM = 24;
const PLOT_W = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;

interface VisualFrame {
  pathsY: number[][];
  p25Y: number[];
  medianY: number[];
  p75Y: number[];
  tickYs: number[];
  ddFloorY: number;
}

/** Deterministic PRNG (Mulberry32) so server/client hydration stays 100% deterministic. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 100;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

function buildLinePath(xs: number[], ys: number[]): string {
  let d = "";
  for (let i = 0; i < ys.length; i++) {
    d += `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`;
  }
  return d;
}

function buildAreaPath(xs: number[], ys: number[], bottomY: number): string {
  if (ys.length === 0) return "";
  const line = buildLinePath(xs, ys);
  const lastX = xs[xs.length - 1].toFixed(1);
  const firstX = xs[0].toFixed(1);
  return `${line} L${lastX},${bottomY.toFixed(1)} L${firstX},${bottomY.toFixed(1)} Z`;
}

function buildEnvelopePoints(
  xs: number[],
  upperY: number[],
  lowerY: number[]
): string {
  const pts: string[] = [];
  for (let i = 0; i < xs.length; i++) {
    pts.push(`${xs[i].toFixed(1)},${upperY[i].toFixed(1)}`);
  }
  for (let i = xs.length - 1; i >= 0; i--) {
    pts.push(`${xs[i].toFixed(1)},${lowerY[i].toFixed(1)}`);
  }
  return pts.join(" ");
}

function cloneFrame(frame: VisualFrame): VisualFrame {
  return {
    pathsY: frame.pathsY.map((arr) => arr.slice()),
    p25Y: frame.p25Y.slice(),
    medianY: frame.medianY.slice(),
    p75Y: frame.p75Y.slice(),
    tickYs: frame.tickYs.slice(),
    ddFloorY: frame.ddFloorY,
  };
}

function lerpFrame(a: VisualFrame, b: VisualFrame, k: number): VisualFrame {
  const pathsY = a.pathsY.map((arr, p) => {
    const targetArr = b.pathsY[p] ?? arr;
    return arr.map((v, i) => v + (targetArr[i] - v) * k);
  });
  const p25Y = a.p25Y.map((v, i) => v + (b.p25Y[i] - v) * k);
  const medianY = a.medianY.map((v, i) => v + (b.medianY[i] - v) * k);
  const p75Y = a.p75Y.map((v, i) => v + (b.p75Y[i] - v) * k);
  const tickYs = a.tickYs.map((v, i) => v + (b.tickYs[i] - v) * k);
  const ddFloorY = a.ddFloorY + (b.ddFloorY - a.ddFloorY) * k;
  return { pathsY, p25Y, medianY, p75Y, tickYs, ddFloorY };
}

export function QuantMonteCarloSchematic({
  compact = false,
}: QuantMonteCarloSchematicProps) {
  const prefersReduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const areaGradId = `quant-area-${uid}`;
  const plotClipId = `quant-clip-${uid}`;

  const [riskKey, setRiskKey] = useState<RiskOption>("1.0");
  const [winRateKey, setWinRateKey] = useState<WinRateOption>("55");

  const riskPct = Number(riskKey);
  const winRate = Number(winRateKey);

  const svgHeight = compact ? 168 : 244;
  const plotH = svgHeight - PAD_TOP - PAD_BOTTOM;
  const plotBottom = PAD_TOP + plotH;

  const xs = useMemo(
    () =>
      Array.from(
        { length: TRADES + 1 },
        (_, step) => PAD_LEFT + (step / TRADES) * PLOT_W
      ),
    []
  );

  const simulation = useMemo(() => {
    const startBalance = 100;
    const paths: number[][] = [];
    let worstDrawdown = 0;

    for (let p = 0; p < NUM_PATHS; p++) {
      const rand = mulberry32(
        104729 + p * 7919 + winRate * 31 + Math.round(riskPct * 100)
      );
      let equity = startBalance;
      let peak = startBalance;
      const curve = [equity];

      for (let t = 0; t < TRADES; t++) {
        const win = rand() * 100 < winRate;
        const delta = win
          ? equity * (riskPct / 100) * REWARD_TO_RISK
          : -equity * (riskPct / 100);
        equity = Math.max(72, equity + delta);
        if (equity > peak) peak = equity;
        const dd = ((peak - equity) / peak) * 100;
        if (dd > worstDrawdown) worstDrawdown = dd;
        curve.push(equity);
      }
      paths.push(curve);
    }

    const p25Curve: number[] = [];
    const medianCurve: number[] = [];
    const p75Curve: number[] = [];

    for (let t = 0; t <= TRADES; t++) {
      const vals = paths.map((curve) => curve[t]).sort((a, b) => a - b);
      p25Curve.push(percentile(vals, 0.25));
      medianCurve.push(percentile(vals, 0.5));
      p75Curve.push(percentile(vals, 0.75));
    }

    const allVals = paths.flat();
    const minPathVal = Math.min(...allVals);
    const maxPathVal = Math.max(...allVals);
    const minVal = Math.min(86, Math.floor(minPathVal - 2));
    const maxVal = Math.max(122, Math.ceil(maxPathVal + 3));

    const toY = (val: number) => {
      const ratio = (val - minVal) / (maxVal - minVal || 1);
      return PAD_TOP + plotH - ratio * plotH;
    };

    const frame: VisualFrame = {
      pathsY: paths.map((curve) => curve.map(toY)),
      p25Y: p25Curve.map(toY),
      medianY: medianCurve.map(toY),
      p75Y: p75Curve.map(toY),
      tickYs: REFERENCE_TICKS.map((tick) => toY(tick)),
      ddFloorY: toY(90),
    };

    const expectancyR =
      (winRate / 100) * REWARD_TO_RISK - (1 - winRate / 100) * 1;
    const medianEnd = medianCurve[medianCurve.length - 1];
    const p25End = p25Curve[p25Curve.length - 1];
    const p75End = p75Curve[p75Curve.length - 1];
    const breachesPropLimit = worstDrawdown >= 10.0;

    return {
      p25Curve,
      medianCurve,
      p75Curve,
      frame,
      worstDrawdown,
      expectancyR,
      medianEnd,
      p25End,
      p75End,
      breachesPropLimit,
    };
  }, [riskPct, winRate, plotH]);

  // Freeze initial JSX geometry for deterministic SSR/hydration; live updates go through refs.
  const [initialFrame] = useState<VisualFrame>(() => simulation.frame);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const plotWrapRef = useRef<HTMLDivElement | null>(null);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const iqrRef = useRef<SVGPolygonElement | null>(null);
  const areaRef = useRef<SVGPathElement | null>(null);
  const medianRef = useRef<SVGPathElement | null>(null);
  const endDotRef = useRef<SVGCircleElement | null>(null);
  const tickRefs = useRef<Array<SVGGElement | null>>([]);
  const ddFloorRef = useRef<SVGGElement | null>(null);

  // Crosshair scrubber refs (zero useState on pointermove)
  const crosshairRef = useRef<SVGGElement | null>(null);
  const spreadLineRef = useRef<SVGLineElement | null>(null);
  const activeDotRef = useRef<SVGGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const liveFrameRef = useRef<VisualFrame>(cloneFrame(simulation.frame));
  const simRef = useRef(simulation);
  const morphRafRef = useRef<number | null>(null);
  const scrubRafRef = useRef<number | null>(null);
  const pointerClientXRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    simRef.current = simulation;
  }, [simulation]);

  const applyVisualFrame = useCallback(
    (frame: VisualFrame) => {
      liveFrameRef.current = frame;

      for (let p = 0; p < frame.pathsY.length; p++) {
        const el = pathRefs.current[p];
        if (el) {
          el.setAttribute("d", buildLinePath(xs, frame.pathsY[p]));
        }
      }

      if (iqrRef.current) {
        iqrRef.current.setAttribute(
          "points",
          buildEnvelopePoints(xs, frame.p75Y, frame.p25Y)
        );
      }

      if (areaRef.current) {
        areaRef.current.setAttribute(
          "d",
          buildAreaPath(xs, frame.medianY, plotBottom)
        );
      }

      if (medianRef.current) {
        medianRef.current.setAttribute("d", buildLinePath(xs, frame.medianY));
      }

      if (endDotRef.current) {
        endDotRef.current.setAttribute(
          "cy",
          frame.medianY[TRADES].toFixed(2)
        );
      }

      for (let i = 0; i < REFERENCE_TICKS.length; i++) {
        const tickEl = tickRefs.current[i];
        if (!tickEl) continue;
        const y = frame.tickYs[i];
        tickEl.setAttribute("transform", `translate(0, ${y.toFixed(2)})`);
        const inRange = y >= PAD_TOP - 4 && y <= plotBottom + 4;
        tickEl.style.opacity = inRange ? "1" : "0";
      }

      if (ddFloorRef.current) {
        const y = frame.ddFloorY;
        ddFloorRef.current.setAttribute(
          "transform",
          `translate(0, ${y.toFixed(2)})`
        );
        const visible = y >= PAD_TOP + 8 && y <= plotBottom + 2;
        ddFloorRef.current.style.opacity = visible ? "1" : "0";
      }
    },
    [xs, plotBottom]
  );

  // Morph paths smoothly via RAF whenever parameters change (zero React re-renders per frame)
  useEffect(() => {
    const targetFrame = simulation.frame;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      applyVisualFrame(targetFrame);
      return;
    }

    if (morphRafRef.current !== null) {
      cancelAnimationFrame(morphRafRef.current);
      morphRafRef.current = null;
    }

    if (prefersReduced) {
      applyVisualFrame(cloneFrame(targetFrame));
      return;
    }

    const startFrame = cloneFrame(liveFrameRef.current);
    const startTime = performance.now();

    const stepMorph = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / MORPH_DURATION_MS);
      const eased = easeOutExpo(progress);
      applyVisualFrame(lerpFrame(startFrame, targetFrame, eased));

      if (progress < 1) {
        morphRafRef.current = requestAnimationFrame(stepMorph);
      } else {
        morphRafRef.current = null;
        applyVisualFrame(cloneFrame(targetFrame));
      }
    };

    morphRafRef.current = requestAnimationFrame(stepMorph);

    return () => {
      if (morphRafRef.current !== null) {
        cancelAnimationFrame(morphRafRef.current);
        morphRafRef.current = null;
      }
    };
  }, [simulation.frame, prefersReduced, applyVisualFrame]);

  // Ensure scrub RAF cancels cleanly on unmount
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
    const wrap = plotWrapRef.current;
    if (clientX === null || !svg || !wrap) return;

    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width <= 0) return;

    const svgX = ((clientX - svgRect.left) / svgRect.width) * SVG_WIDTH;
    const clampedPlotX = Math.max(
      PAD_LEFT,
      Math.min(PAD_LEFT + PLOT_W, svgX)
    );
    const ratio = (clampedPlotX - PAD_LEFT) / PLOT_W;
    const step = Math.max(0, Math.min(TRADES, Math.round(ratio * TRADES)));

    const frame = liveFrameRef.current;
    const sim = simRef.current;
    const x = xs[step];
    const medY = frame.medianY[step];
    const p25Y = frame.p25Y[step];
    const p75Y = frame.p75Y[step];

    if (crosshairRef.current) {
      crosshairRef.current.style.transform = `translate3d(${x.toFixed(2)}px, 0px, 0px)`;
      crosshairRef.current.style.opacity = "1";
    }

    if (spreadLineRef.current) {
      spreadLineRef.current.setAttribute("y1", p75Y.toFixed(2));
      spreadLineRef.current.setAttribute("y2", p25Y.toFixed(2));
    }

    if (activeDotRef.current) {
      activeDotRef.current.style.transform = `translate3d(${x.toFixed(2)}px, ${medY.toFixed(2)}px, 0px)`;
      activeDotRef.current.style.opacity = "1";
    }

    if (tooltipRef.current) {
      const medVal = sim.medianCurve[step];
      const p25Val = sim.p25Curve[step];
      const p75Val = sim.p75Curve[step];
      tooltipRef.current.textContent = `T-${String(step).padStart(2, "0")} · MED ${medVal.toFixed(1)}% · P25-P75 ${p25Val.toFixed(1)}-${p75Val.toFixed(1)}%`;

      const wrapRect = wrap.getBoundingClientRect();
      const tipWidth = tooltipRef.current.offsetWidth || 228;
      const anchorCssX =
        svgRect.left - wrapRect.left + (x / SVG_WIDTH) * svgRect.width;
      const desiredX = anchorCssX - tipWidth / 2;
      const clampedX = Math.max(
        8,
        Math.min(wrapRect.width - tipWidth - 8, desiredX)
      );

      tooltipRef.current.style.transform = `translate3d(${clampedX.toFixed(1)}px, 8px, 0px)`;
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
      {/* Instrument Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[11px] tracking-tight text-[var(--ink-secondary)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[var(--accent)]"
          />
          <span className="font-semibold text-[var(--ink-primary)]">
            MONTE CARLO EQUITY &amp; DRAWDOWN SIMULATOR
          </span>
        </div>

        <BlurCrossfade
          inline
          contentKey={simulation.breachesPropLimit ? "breach" : "pass"}
          className="inline-flex items-center"
        >
          <span
            className={`inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums ${
              simulation.breachesPropLimit
                ? "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                : "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                simulation.breachesPropLimit
                  ? "bg-[var(--status-danger)]"
                  : "bg-[var(--status-positive)]"
              }`}
            />
            {simulation.breachesPropLimit
              ? compact
                ? "BREACH RISK"
                : "BREACH RISK (>10% DD)"
              : compact
                ? "PASS"
                : "PASS · PROP COMPLIANT"}
          </span>
        </BlurCrossfade>
      </div>

      {/* Interactive Parameter Controls (full view only) */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
              Risk / Trade
            </span>
            <ClipSegmentedTabs
              size="sm"
              options={RISK_OPTIONS}
              value={riskKey}
              onChange={setRiskKey}
              ariaLabel="Select risk percentage per trade"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
              Win Rate (1:1.8 R:R)
            </span>
            <ClipSegmentedTabs
              size="sm"
              options={WINRATE_OPTIONS}
              value={winRateKey}
              onChange={setWinRateKey}
              ariaLabel="Select strategy win rate"
            />
          </div>
        </div>
      )}

      {/* Vector Plot Surface */}
      <div
        ref={plotWrapRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={hideScrubber}
        onPointerCancel={hideScrubber}
        className={`relative bg-[var(--bg-canvas)]/55 px-3 py-3 select-none ${
          compact ? "" : "cursor-crosshair touch-pan-y"
        }`}
      >
        {/* Floating Pointer Telemetry Badge (DOM-ref updated, zero useState) */}
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
          viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Monte Carlo equity simulation with 12 paths, P25 to P75 interquartile envelope, median curve, and negative 10 percent drawdown floor"
        >
          <defs>
            <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.16" />
              <stop offset="72%" stopColor="#1D4ED8" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
            </linearGradient>
            <clipPath id={plotClipId}>
              <rect
                x={PAD_LEFT}
                y={PAD_TOP - 6}
                width={PLOT_W}
                height={plotH + 10}
              />
            </clipPath>
          </defs>

          {/* Horizontal Y-Axis Reference Ticks (90%, 100%, 110%, 120%) */}
          {REFERENCE_TICKS.map((tick, i) => {
            const initialY = initialFrame.tickYs[i];
            const isBase = tick === 100;
            const isFloor = tick === 90;
            return (
              <g
                key={tick}
                ref={(el) => {
                  tickRefs.current[i] = el;
                }}
                transform={`translate(0, ${initialY.toFixed(2)})`}
              >
                {!isFloor && (
                  <line
                    x1={PAD_LEFT}
                    y1={0}
                    x2={SVG_WIDTH - PAD_RIGHT}
                    y2={0}
                    stroke={
                      isBase
                        ? "rgba(15, 20, 30, 0.16)"
                        : "rgba(15, 20, 30, 0.07)"
                    }
                    strokeDasharray={isBase ? "3 3" : undefined}
                    strokeWidth="1"
                  />
                )}
                <text
                  x={PAD_LEFT - 8}
                  y={3.5}
                  textAnchor="end"
                  fill={
                    isFloor
                      ? "#B42318"
                      : isBase
                        ? "#0F141E"
                        : "#5B6475"
                  }
                  fontSize="9.5"
                  fontWeight={isBase ? "600" : "400"}
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* X-Axis Baseline & Trade Step Ticks */}
          <line
            x1={PAD_LEFT}
            y1={plotBottom}
            x2={SVG_WIDTH - PAD_RIGHT}
            y2={plotBottom}
            stroke="rgba(15, 20, 30, 0.1)"
            strokeWidth="1"
          />
          {[0, 10, 20, 30, 40].map((step) => {
            const x = xs[step];
            return (
              <g key={step}>
                <line
                  x1={x}
                  y1={plotBottom}
                  x2={x}
                  y2={plotBottom + 4}
                  stroke="rgba(15, 20, 30, 0.16)"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={svgHeight - 6}
                  textAnchor={
                    step === 0 ? "start" : step === 40 ? "end" : "middle"
                  }
                  fill="#5B6475"
                  fontSize="9.5"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                >
                  T{step}
                </text>
              </g>
            );
          })}

          {/* Clipped Curve Geometry Layer */}
          <g clipPath={`url(#${plotClipId})`}>
            {/* Translucent Cobalt Gradient Area Under Median Path */}
            <path
              ref={areaRef}
              d={buildAreaPath(xs, initialFrame.medianY, plotBottom)}
              fill={`url(#${areaGradId})`}
            />

            {/* P25-P75 Interquartile Spread Envelope */}
            <polygon
              ref={iqrRef}
              points={buildEnvelopePoints(
                xs,
                initialFrame.p75Y,
                initialFrame.p25Y
              )}
              fill="rgba(29, 78, 216, 0.09)"
              stroke="rgba(29, 78, 216, 0.18)"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />

            {/* 12 Crisp Stochastic Simulation Trajectories */}
            {initialFrame.pathsY.map((curveY, idx) => (
              <path
                key={idx}
                ref={(el) => {
                  pathRefs.current[idx] = el;
                }}
                d={buildLinePath(xs, curveY)}
                fill="none"
                stroke="rgba(15, 20, 30, 0.12)"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Razor-Sharp Cobalt Median Curve */}
            <path
              ref={medianRef}
              d={buildLinePath(xs, initialFrame.medianY)}
              fill="none"
              stroke="#1D4ED8"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Non-Overlapping -10% Max Drawdown Floor Hairline & Tag */}
          <g
            ref={ddFloorRef}
            transform={`translate(0, ${initialFrame.ddFloorY.toFixed(2)})`}
          >
            <line
              x1={PAD_LEFT}
              y1={0}
              x2={SVG_WIDTH - PAD_RIGHT}
              y2={0}
              stroke="#B42318"
              strokeOpacity="0.65"
              strokeDasharray="4 3"
              strokeWidth="1.1"
            />
            <rect
              x={SVG_WIDTH - PAD_RIGHT - 114}
              y={-17}
              width={114}
              height={14}
              rx={4}
              fill="#FEF3F2"
              stroke="rgba(180, 35, 24, 0.28)"
              strokeWidth="0.75"
            />
            <text
              x={SVG_WIDTH - PAD_RIGHT - 57}
              y={-7.2}
              textAnchor="middle"
              fill="#B42318"
              fontSize="8.5"
              fontWeight="600"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              -10% MAX DD FLOOR
            </text>
          </g>

          {/* Terminal Median Anchor Dot */}
          <circle
            ref={endDotRef}
            cx={xs[TRADES]}
            cy={initialFrame.medianY[TRADES]}
            r="3.25"
            fill="#1D4ED8"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />

          {/* Zero-Re-Render Pointer Crosshair Scrubber (!compact) */}
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
                  y1={PAD_TOP}
                  x2={0}
                  y2={plotBottom}
                  stroke="#1D4ED8"
                  strokeOpacity="0.45"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <line
                  ref={spreadLineRef}
                  x1={0}
                  y1={PAD_TOP}
                  x2={0}
                  y2={PAD_TOP}
                  stroke="#1D4ED8"
                  strokeOpacity="0.38"
                  strokeWidth="3.5"
                  strokeLinecap="round"
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
      <div
        className={`grid gap-px border-t border-[var(--border-hairline)] bg-[var(--border-hairline)] font-mono text-[11px] ${
          compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
        <div className="bg-[var(--bg-subtle)] px-3.5 py-2.5">
          <div className="text-[11px] text-[var(--ink-muted)]">MEDIAN 40T</div>
          <div className="mt-0.5 font-semibold tabular-nums text-[var(--ink-primary)]">
            {simulation.medianEnd >= 100 ? "+" : ""}
            {(simulation.medianEnd - 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-[var(--bg-subtle)] px-3.5 py-2.5">
          <div className="text-[11px] text-[var(--ink-muted)]">
            WORST PATH DD
          </div>
          <div
            className={`mt-0.5 font-semibold tabular-nums ${
              simulation.breachesPropLimit
                ? "text-[var(--status-danger)]"
                : "text-[var(--ink-primary)]"
            }`}
          >
            -{simulation.worstDrawdown.toFixed(1)}%
          </div>
        </div>
        <div className="bg-[var(--bg-subtle)] px-3.5 py-2.5">
          <div className="text-[11px] text-[var(--ink-muted)]">EXPECTANCY</div>
          <div className="mt-0.5 font-semibold tabular-nums text-[var(--accent-deep)]">
            {simulation.expectancyR >= 0 ? "+" : ""}
            {simulation.expectancyR.toFixed(2)}R
          </div>
        </div>
        {!compact && (
          <div className="bg-[var(--bg-subtle)] px-3.5 py-2.5">
            <div className="text-[11px] text-[var(--ink-muted)]">
              P25-P75 RANGE
            </div>
            <div className="mt-0.5 font-semibold tabular-nums text-[var(--ink-primary)]">
              {simulation.p25End.toFixed(1)}-{simulation.p75End.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
