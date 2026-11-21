"use client";

import { useMemo, useState } from "react";

interface QuantMonteCarloSchematicProps {
  compact?: boolean;
}

/** Deterministic PRNG (Mulberry32) so server/client hydration is 100% deterministic with zero flicker. */
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

const RISK_OPTIONS = [0.5, 1.0, 1.5, 2.0];
const WINRATE_OPTIONS = [45, 50, 55, 60];

export function QuantMonteCarloSchematic({
  compact = false,
}: QuantMonteCarloSchematicProps) {
  const [riskPct, setRiskPct] = useState<number>(1.0);
  const [winRate, setWinRate] = useState<number>(55);

  const simulation = useMemo(() => {
    const numPaths = compact ? 8 : 12;
    const trades = 40;
    const rewardToRisk = 1.8;
    const startBalance = 100; // indexed to 100
    const paths: number[][] = [];
    let worstDrawdown = 0;

    for (let p = 0; p < numPaths; p++) {
      const rand = mulberry32(104729 + p * 7919 + winRate * 31 + Math.round(riskPct * 100));
      let equity = startBalance;
      let peak = startBalance;
      const curve = [equity];

      for (let t = 0; t < trades; t++) {
        const win = rand() * 100 < winRate;
        const delta = win
          ? equity * (riskPct / 100) * rewardToRisk
          : -equity * (riskPct / 100);
        equity = Math.max(70, equity + delta);
        if (equity > peak) peak = equity;
        const dd = ((peak - equity) / peak) * 100;
        if (dd > worstDrawdown) worstDrawdown = dd;
        curve.push(equity);
      }
      paths.push(curve);
    }

    // Compute median equity at each step
    const medianCurve: number[] = [];
    for (let t = 0; t <= trades; t++) {
      const vals = paths.map((p) => p[t]).sort((a, b) => a - b);
      medianCurve.push(vals[Math.floor(vals.length / 2)]);
    }

    const allVals = paths.flat();
    const minVal = Math.min(88, ...allVals);
    const maxVal = Math.max(115, ...allVals);
    const expectancyR =
      (winRate / 100) * rewardToRisk - (1 - winRate / 100) * 1;
    const medianEnd = medianCurve[medianCurve.length - 1];
    const breachesPropLimit = worstDrawdown >= 10.0;

    return {
      paths,
      medianCurve,
      minVal,
      maxVal,
      worstDrawdown,
      expectancyR,
      medianEnd,
      breachesPropLimit,
      trades,
    };
  }, [riskPct, winRate, compact]);

  const width = 560;
  const height = compact ? 150 : 220;
  const padX = 28;
  const padY = 18;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const toX = (step: number) => padX + (step / simulation.trades) * plotW;
  const toY = (val: number) => {
    const ratio = (val - simulation.minVal) / (simulation.maxVal - simulation.minVal || 1);
    return padY + plotH - ratio * plotH;
  };

  const toPathD = (curve: number[]) =>
    curve
      .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
      .join(" ");

  const baselineY = toY(100);
  const drawdownFloorY = toY(90);

  return (
    <div className="w-full overflow-hidden rounded-lg border border-[#E5E2DC] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E2DC] bg-[#FAF9F6] px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[11px] text-[#4B4E54]">
          <span className="h-2 w-2 rounded-full bg-[#1D4ED8]" />
          <span className="font-semibold text-[#111214]">
            MONTE CARLO RISK &amp; DRAWDOWN SIMULATOR
          </span>
        </div>
        <span
          className={`rounded border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${
            simulation.breachesPropLimit
              ? "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
              : "border-[#BBF7D0] bg-[#ECFDF5] text-[#15803D]"
          }`}
        >
          {simulation.breachesPropLimit
            ? "Drawdown Limit Breach (>10%)"
            : "Prop-Firm Rule Compliant"}
        </span>
      </div>

      {/* Interactive Parameter Controls (full view only) */}
      {!compact && (
        <div className="grid gap-4 border-b border-[#E5E2DC] bg-white px-4 py-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-[#6E727A]">
              Risk Per Trade (% Equity)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {RISK_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setRiskPct(opt)}
                  className={`btn-press rounded border px-2.5 py-1 font-mono text-xs tabular-nums ${
                    riskPct === opt
                      ? "border-[#1D4ED8] bg-[#EFF4FF] font-semibold text-[#0F3D91]"
                      : "border-[#E5E2DC] bg-[#FAF9F6] text-[#4B4E54] hover:border-[#D1CDC4]"
                  }`}
                >
                  {opt.toFixed(1)}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-[#6E727A]">
              Strategy Win Rate (1 : 1.8 R:R)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WINRATE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setWinRate(opt)}
                  className={`btn-press rounded border px-2.5 py-1 font-mono text-xs tabular-nums ${
                    winRate === opt
                      ? "border-[#1D4ED8] bg-[#EFF4FF] font-semibold text-[#0F3D91]"
                      : "border-[#E5E2DC] bg-[#FAF9F6] text-[#4B4E54] hover:border-[#D1CDC4]"
                  }`}
                >
                  {opt}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <div className="swiss-grid-bg px-3 py-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label="Monte Carlo simulated equity curves and prop-firm drawdown floor"
        >
          {/* Baseline 100% */}
          <line
            x1={padX}
            y1={baselineY}
            x2={width - padX}
            y2={baselineY}
            stroke="#D1CDC4"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={padX + 4}
            y={baselineY - 5}
            fill="#6E727A"
            fontSize="9"
            fontFamily="var(--font-geist-mono), monospace"
          >
            BASE 100.0
          </text>

          {/* -10% Prop-Firm Max Drawdown Floor */}
          {drawdownFloorY < height - 6 && (
            <>
              <line
                x1={padX}
                y1={drawdownFloorY}
                x2={width - padX}
                y2={drawdownFloorY}
                stroke="#DC2626"
                strokeOpacity="0.45"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={width - padX - 98}
                y={drawdownFloorY - 4}
                fill="#991B1B"
                fontSize="9"
                fontFamily="var(--font-geist-mono), monospace"
              >
                -10% MAX DD FLOOR
              </text>
            </>
          )}

          {/* Stochastic Sample Paths */}
          {simulation.paths.map((curve, idx) => (
            <path
              key={idx}
              d={toPathD(curve)}
              fill="none"
              stroke="#94A3B8"
              strokeOpacity="0.38"
              strokeWidth="1.25"
            />
          ))}

          {/* Median Equity Path */}
          <path
            d={toPathD(simulation.medianCurve)}
            fill="none"
            stroke="#1D4ED8"
            strokeWidth="2.4"
          />
        </svg>
      </div>

      {/* Telemetry Footer */}
      <div className="grid grid-cols-3 divide-x divide-[#E5E2DC] border-t border-[#E5E2DC] bg-[#FAF9F6] font-mono text-[11px]">
        <div className="px-3 py-2">
          <div className="text-[10px] text-[#6E727A]">MEDIAN 40T</div>
          <div className="font-semibold tabular-nums text-[#111214]">
            {simulation.medianEnd >= 100 ? "+" : ""}
            {(simulation.medianEnd - 100).toFixed(1)}%
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] text-[#6E727A]">WORST PATH DD</div>
          <div className="font-semibold tabular-nums text-[#111214]">
            -{simulation.worstDrawdown.toFixed(1)}%
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] text-[#6E727A]">EXPECTANCY</div>
          <div className="font-semibold tabular-nums text-[#1D4ED8]">
            {simulation.expectancyR >= 0 ? "+" : ""}
            {simulation.expectancyR.toFixed(2)}R
          </div>
        </div>
      </div>
    </div>
  );
}
