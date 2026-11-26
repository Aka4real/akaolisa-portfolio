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
const PAD_LEFT = 48;
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

  const svgHeight = compact ? 172 : 244;
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
      tooltipRef.current.textContent = `Trade ${step} · Median ${medVal.toFixed(1)}% · Spread ${p25Val.toFixed(1)} to ${p75Val.toFixed(1)}%`;

      const wrapRect = wrap.getBoundingClientRect();
      const tipWidth = tooltipRef.current.offsetWidth || 260;
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

  return (
    <div className="w-full overflow-hidden bg-[var(--bg-surface)]">
      {/* Instrument Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3">
        <span className="type-sm font-semibold text-[var(--ink-primary)]">
          Monte Carlo equity and drawdown simulator
        </span>

        <BlurCrossfade
          inline
          contentKey={simulation.breachesPropLimit ? "breach" : "pass"}
          className="inline-flex items-center"
        >
          <span
            className={`type-sm font-medium tabular-nums ${
              simulation.breachesPropLimit
                ? "text-[var(--status-danger)]"
                : "text-[var(--status-positive)]"
            }`}
          >
            {simulation.breachesPropLimit
              ? "Exceeds 10% drawdown limit"
              : "Within 10% prop drawdown limit"}
          </span>
        </BlurCrossfade>
      </div>

      {/* Interactive Parameter Controls */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="type-sm text-[var(--ink-muted)]">
              Risk per trade
            </span>
            <ClipSegmentedTabs
              size="sm"
              options={RISK_OPTIONS}
              value={riskKey}
              onChange={setRiskKey}
              ariaLabel="Select risk percentage per trade"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="type-sm text-[var(--ink-muted)]">
              Win rate (1:1.8 R:R)
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

      {/* Plot Canvas */}
      <div
        ref={plotWrapRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={hideScrubber}
        onPointerCancel={hideScrubber}
        className={`relative bg-[var(--bg-canvas)]/60 px-3 py-3 select-none ${
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
          viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Monte Carlo equity simulation with 12 stochastic paths, P25 to P75 interquartile envelope, median curve, and negative 10 percent drawdown floor"
        >
          <defs>
            <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1456D1" stopOpacity="0.18" />
              <stop offset="75%" stopColor="#1456D1" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#1456D1" stopOpacity="0" />
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
                        ? "rgba(9, 19, 29, 0.16)"
                        : "rgba(9, 19, 29, 0.07)"
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
                        ? "#09131D"
                        : "#506376"
                  }
                  fontSize="9.5"
                  fontWeight={isBase ? "600" : "500"}
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          <line
            x1={PAD_LEFT}
            y1={plotBottom}
            x2={SVG_WIDTH - PAD_RIGHT}
            y2={plotBottom}
            stroke="rgba(9, 19, 29, 0.1)"
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
                  stroke="rgba(9, 19, 29, 0.16)"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={svgHeight - 6}
                  textAnchor={
                    step === 0 ? "start" : step === 40 ? "end" : "middle"
                  }
                  fill="#506376"
                  fontSize="9.5"
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                >
                  T{step}
                </text>
              </g>
            );
          })}

          <g clipPath={`url(#${plotClipId})`}>
            <path
              ref={areaRef}
              d={buildAreaPath(xs, initialFrame.medianY, plotBottom)}
              fill={`url(#${areaGradId})`}
            />

            <polygon
              ref={iqrRef}
              points={buildEnvelopePoints(
                xs,
                initialFrame.p75Y,
                initialFrame.p25Y
              )}
              fill="rgba(20, 86, 209, 0.09)"
              stroke="rgba(20, 86, 209, 0.2)"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />

            {initialFrame.pathsY.map((curveY, idx) => (
              <path
                key={idx}
                ref={(el) => {
                  pathRefs.current[idx] = el;
                }}
                d={buildLinePath(xs, curveY)}
                fill="none"
                stroke="rgba(9, 19, 29, 0.14)"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            <path
              ref={medianRef}
              d={buildLinePath(xs, initialFrame.medianY)}
              fill="none"
              stroke="#1456D1"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

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
              strokeOpacity="0.68"
              strokeDasharray="4 3"
              strokeWidth="1.1"
            />
            <text
              x={SVG_WIDTH - PAD_RIGHT}
              y={-6}
              textAnchor="end"
              fill="#B42318"
              fontSize="9"
              fontWeight="500"
              fontFamily="var(--font-mono), ui-monospace, monospace"
            >
              -10% max drawdown floor
            </text>
          </g>

          <circle
            ref={endDotRef}
            cx={xs[TRADES]}
            cy={initialFrame.medianY[TRADES]}
            r="3.5"
            fill="#1456D1"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />

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
                  stroke="#1456D1"
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
                  stroke="#1456D1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeOpacity="0.45"
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
                <circle cx={0} cy={0} r="7.5" fill="rgba(20, 86, 209, 0.16)" />
                <circle
                  cx={0}
                  cy={0}
                  r="3.8"
                  fill="#1456D1"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                />
              </g>
            </>
          )}
        </svg>
      </div>

      {/* Calibrated Telemetry Footer */}
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border-hairline)] border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] tabular-nums sm:grid-cols-4 sm:divide-y-0">
        <div className="px-4 py-3">
          <div className="type-kicker text-[var(--ink-muted)]">Median end</div>
          <div className="type-meta mt-1 font-medium text-[var(--ink-primary)]">
            <BlurCrossfade inline contentKey={`${riskKey}-${winRateKey}-med`}>
              {simulation.medianEnd.toFixed(1)}%
            </BlurCrossfade>
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="type-kicker text-[var(--ink-muted)]">
            Worst drawdown
          </div>
          <div
            className={`type-meta mt-1 font-medium ${
              simulation.breachesPropLimit
                ? "text-[var(--status-danger)]"
                : "text-[var(--status-positive)]"
            }`}
          >
            <BlurCrossfade inline contentKey={`${riskKey}-${winRateKey}-dd`}>
              -{simulation.worstDrawdown.toFixed(1)}%
            </BlurCrossfade>
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="type-kicker text-[var(--ink-muted)]">Expectancy</div>
          <div className="type-meta mt-1 font-medium text-[var(--accent-deep)]">
            <BlurCrossfade inline contentKey={`${riskKey}-${winRateKey}-exp`}>
              {simulation.expectancyR >= 0 ? "+" : ""}
              {simulation.expectancyR.toFixed(2)}R
            </BlurCrossfade>
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="type-kicker text-[var(--ink-muted)]">
            P25 to P75 spread
          </div>
          <div className="type-meta mt-1 font-medium text-[var(--ink-primary)]">
            <BlurCrossfade inline contentKey={`${riskKey}-${winRateKey}-iqr`}>
              {simulation.p25End.toFixed(0)} to {simulation.p75End.toFixed(0)}%
            </BlurCrossfade>
          </div>
        </div>
      </div>
    </div>
  );
}
