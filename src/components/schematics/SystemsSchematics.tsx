"use client";

import { useState } from "react";

interface SchematicProps {
  compact?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 1. KORIDOR ENGINE OS — Freight Network & Telemetry Dispatch Schematic       */
/* -------------------------------------------------------------------------- */
const KORIDOR_NODES = [
  {
    id: "ingest",
    code: "N-01",
    label: "Fleet Telemetry",
    tech: "GPS / WebSockets",
    spec: "Live coordinate stream & vehicle status ingestion with heartbeat anomaly flags.",
  },
  {
    id: "mapbox",
    code: "N-02",
    label: "Mapbox GL Dispatch",
    tech: "Mapbox GL JS",
    spec: "Geospatial haulage corridor map rendering active trucks, waypoints, and ETA deltas.",
  },
  {
    id: "gemini",
    code: "N-03",
    label: "Gemini Load Matcher",
    tech: "Google Gemini AI",
    spec: "Automated cargo-to-fleet matching scoring capacity, route overlap, and dispatch priority.",
  },
  {
    id: "supabase",
    code: "N-04",
    label: "RLS Fleet Ledger",
    tech: "Supabase PostgreSQL",
    spec: "Role-isolated Row-Level Security tables separating shippers, fleet ops, and dispatchers.",
  },
];

export function KoridorSchematic({ compact = false }: SchematicProps) {
  const [selected, setSelected] = useState(0);
  const active = KORIDOR_NODES[selected];

  return (
    <div className="w-full overflow-hidden rounded-lg border border-[#E5E2DC] bg-white">
      <div className="flex items-center justify-between border-b border-[#E5E2DC] bg-[#FAF9F6] px-4 py-2.5 font-mono text-[11px]">
        <span className="flex items-center gap-2 font-semibold text-[#111214]">
          <span className="h-2 w-2 rounded-full bg-[#1D4ED8]" />
          KORIDOR DISPATCH &amp; TELEMETRY TOPOLOGY
        </span>
        <span className="text-[#6E727A]">NEXT.JS · MAPBOX · GEMINI</span>
      </div>

      <div className="swiss-grid-bg p-4">
        <div className={`grid grid-cols-2 gap-2 ${compact ? "" : "sm:grid-cols-4"}`}>
          {KORIDOR_NODES.map((node, idx) => {
            const isSelected = !compact && idx === selected;
            return (
              <button
                key={node.id}
                type="button"
                disabled={compact}
                onClick={() => setSelected(idx)}
                className={`rounded border p-2.5 text-left transition-colors ${
                  isSelected
                    ? "border-[#1D4ED8] bg-[#EFF4FF]"
                    : "border-[#E5E2DC] bg-white hover:border-[#D1CDC4]"
                } ${compact ? "cursor-default" : "btn-press cursor-pointer"}`}
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className={isSelected ? "text-[#0F3D91] font-semibold" : "text-[#6E727A]"}>
                    {node.code}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
                </div>
                <div className="mt-1.5 text-xs font-semibold text-[#111214]">
                  {node.label}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-[#6E727A]">
                  {node.tech}
                </div>
              </button>
            );
          })}
        </div>

        {/* Corridor Route Vector */}
        <div className="mt-3 rounded border border-[#E5E2DC] bg-white/95 px-3 py-2">
          <svg
            viewBox="0 0 540 56"
            className="h-auto w-full"
            role="img"
            aria-label="Corridor dispatch route topology diagram"
          >
            <line
              x1="36"
              y1="28"
              x2="504"
              y2="28"
              stroke="#D1CDC4"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <line
              x1="36"
              y1="28"
              x2="348"
              y2="28"
              stroke="#1D4ED8"
              strokeWidth="2.2"
            />
            {[
              { x: 36, label: "ORIGIN · HUB-01", active: true },
              { x: 192, label: "WAYPOINT · LOAD MATCH", active: true },
              { x: 348, label: "TELEMETRY ACTIVE", active: true },
              { x: 504, label: "DESTINATION · ETA", active: false },
            ].map((pt) => (
              <g key={pt.label}>
                <circle
                  cx={pt.x}
                  cy="28"
                  r={pt.active ? "5" : "4"}
                  fill={pt.active ? "#1D4ED8" : "#FAF9F6"}
                  stroke={pt.active ? "#0F3D91" : "#6E727A"}
                  strokeWidth="1.5"
                />
                <text
                  x={pt.x}
                  y="48"
                  textAnchor={
                    pt.x === 36 ? "start" : pt.x === 504 ? "end" : "middle"
                  }
                  fill="#4B4E54"
                  fontSize="8.5"
                  fontFamily="var(--font-geist-mono), monospace"
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {!compact && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-[#BFDBFE] bg-[#EFF4FF]/65 px-3.5 py-2.5 text-xs">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#0F3D91]">
                {active.code} · {active.label}:{" "}
              </span>
              <span className="text-[#111214]">{active.spec}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. FORTRESS FLEET AI — Institutional Multi-Agent Governance Visualizer      */
/* -------------------------------------------------------------------------- */
const FORTRESS_GATES = [
  {
    id: "router",
    label: "Gemini / Gemma 2 Router",
    status: "VERIFIED",
    detail:
      "Routes high-complexity planning to Gemini while offloading fast policy classification and schema verification to Gemma 2.",
  },
  {
    id: "memory",
    label: "pgvector Semantic Memory",
    status: "INDEXED",
    detail:
      "Retrieves historical institutional directives and prior audit logs via Supabase PostgreSQL pgvector cosine similarity.",
  },
  {
    id: "guardrail",
    label: "Autonomous Tool Guardrail",
    status: "ENFORCED",
    detail:
      "Intercepts outbound agent tool calls, validates schema/scope boundaries, and blocks unauthorized external mutations.",
  },
  {
    id: "cloudrun",
    label: "Google Cloud Run Sandbox",
    status: "ISOLATED",
    detail:
      "Stateless containerized execution boundary providing reproducible governance logs and elastic burst capacity.",
  },
];

export function FortressSchematic({ compact = false }: SchematicProps) {
  const [activeGate, setActiveGate] = useState(2);

  return (
    <div className="w-full overflow-hidden rounded-lg border border-[#E5E2DC] bg-white">
      <div className="flex items-center justify-between border-b border-[#E5E2DC] bg-[#FAF9F6] px-4 py-2.5 font-mono text-[11px]">
        <span className="flex items-center gap-2 font-semibold text-[#111214]">
          <span className="h-2 w-2 rounded-full bg-[#15803D]" />
          FORTRESS MULTI-AGENT GOVERNANCE PIPELINE
        </span>
        <span className="text-[#6E727A]">CLOUD RUN · PGVECTOR</span>
      </div>

      <div className="swiss-dot-bg p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {FORTRESS_GATES.map((gate, i) => {
            const selected = !compact && i === activeGate;
            return (
              <button
                key={gate.id}
                type="button"
                disabled={compact}
                onClick={() => setActiveGate(i)}
                className={`flex items-center justify-between rounded border px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? "border-[#1D4ED8] bg-[#EFF4FF]"
                    : "border-[#E5E2DC] bg-white hover:border-[#D1CDC4]"
                } ${compact ? "cursor-default" : "btn-press cursor-pointer"}`}
              >
                <div>
                  <div className="font-mono text-[10px] text-[#6E727A]">
                    GATE 0{i + 1}
                  </div>
                  <div className="text-xs font-semibold text-[#111214]">
                    {gate.label}
                  </div>
                </div>
                <span className="rounded border border-[#BBF7D0] bg-[#ECFDF5] px-2 py-0.5 font-mono text-[9.5px] font-semibold text-[#15803D]">
                  {gate.status}
                </span>
              </button>
            );
          })}
        </div>

        {!compact && (
          <div className="mt-3 rounded border border-[#E5E2DC] bg-[#FAF9F6] p-3.5">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#0F3D91]">
              <span>Active Checkpoint Audit · GATE 0{activeGate + 1}</span>
              <span className="text-[#15803D]">POLICY PASS</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#111214]">
              {FORTRESS_GATES[activeGate].detail}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. INSTITUTIONAL CRYPTO & WEALTH PLATFORM — SVG Financial Feed & Ledger     */
/* -------------------------------------------------------------------------- */
const CRYPTO_SERIES: Record<
  "24H" | "7D" | "30D",
  { points: number[]; delta: string; apy: string; feedLatency: string }
> = {
  "24H": {
    points: [99.4, 99.8, 99.6, 100.2, 100.9, 100.5, 101.4, 101.8, 102.1],
    delta: "+2.71%",
    apy: "6.40% APR",
    feedLatency: "38ms WS",
  },
  "7D": {
    points: [96.2, 97.5, 97.1, 98.9, 100.4, 99.8, 102.3, 103.6, 104.8],
    delta: "+8.94%",
    apy: "6.42% APR",
    feedLatency: "41ms WS",
  },
  "30D": {
    points: [91.0, 93.4, 92.8, 96.5, 98.1, 101.2, 103.9, 106.4, 109.2],
    delta: "+20.00%",
    apy: "6.45% APR",
    feedLatency: "39ms WS",
  },
};

export function CryptoWealthSchematic({ compact = false }: SchematicProps) {
  const [period, setPeriod] = useState<"24H" | "7D" | "30D">("7D");
  const current = CRYPTO_SERIES[period];

  const w = 520;
  const h = compact ? 110 : 160;
  const padX = 18;
  const padY = 16;
  const min = Math.min(...current.points) - 1;
  const max = Math.max(...current.points) + 1;

  const coords = current.points.map((val, idx) => {
    const x = padX + (idx / (current.points.length - 1)) * (w - padX * 2);
    const y = padY + (h - padY * 2) - ((val - min) / (max - min)) * (h - padY * 2);
    return { x, y };
  });

  const linePath = coords
    .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="w-full overflow-hidden rounded-lg border border-[#E5E2DC] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E2DC] bg-[#FAF9F6] px-4 py-2.5 font-mono text-[11px]">
        <span className="font-semibold text-[#111214]">
          WEBSOCKET TICKER &amp; PG YIELD ENGINE (ANONYMIZED)
        </span>
        {!compact ? (
          <div className="flex items-center gap-1">
            {(["24H", "7D", "30D"] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setPeriod(tf)}
                className={`btn-press rounded border px-2 py-0.5 text-[10px] font-semibold ${
                  period === tf
                    ? "border-[#1D4ED8] bg-[#EFF4FF] text-[#0F3D91]"
                    : "border-[#E5E2DC] bg-white text-[#6E727A] hover:text-[#111214]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[#15803D]">{current.delta}</span>
        )}
      </div>

      <div className="swiss-grid-bg px-3 py-3">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-auto w-full"
          role="img"
          aria-label="Custom SVG portfolio telemetry chart"
        >
          <path d={linePath} fill="none" stroke="#1D4ED8" strokeWidth="2.2" />
          {coords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={i === coords.length - 1 ? 4 : 2.2}
              fill={i === coords.length - 1 ? "#1D4ED8" : "#FFFFFF"}
              stroke="#1D4ED8"
              strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[#E5E2DC] border-t border-[#E5E2DC] bg-[#FAF9F6] font-mono text-[11px]">
        <div className="px-3 py-2">
          <div className="text-[10px] text-[#6E727A]">INDEX DELTA</div>
          <div className="font-semibold text-[#15803D]">{current.delta}</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] text-[#6E727A]">PG YIELD CRON</div>
          <div className="font-semibold text-[#111214]">{current.apy}</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] text-[#6E727A]">TICKER FEED</div>
          <div className="font-semibold text-[#1D4ED8]">{current.feedLatency}</div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. STITCH RETAIL OPERATIONS OS — Multi-Store Reconciliation Matrix          */
/* -------------------------------------------------------------------------- */
const STITCH_BRANCHES = [
  {
    name: "Branch 01 · Central",
    skus: "1,420 Active SKUs",
    posSync: "Reconciled",
    variance: "0.00%",
    restock: "4 Supplier POs Queued",
  },
  {
    name: "Branch 02 · Express",
    skus: "890 Active SKUs",
    posSync: "Reconciled",
    variance: "0.00%",
    restock: "2 Transfers Pending",
  },
  {
    name: "Supplier Hub",
    skus: "18 Active Vendors",
    posSync: "Invoice Matched",
    variance: "Verified",
    restock: "Auto-Ledger Synced",
  },
];

export function StitchRetailSchematic({ compact = false }: SchematicProps) {
  const [branchIdx, setBranchIdx] = useState(0);
  const current = STITCH_BRANCHES[branchIdx];

  return (
    <div className="w-full overflow-hidden rounded-lg border border-[#E5E2DC] bg-white">
      <div className="flex items-center justify-between border-b border-[#E5E2DC] bg-[#FAF9F6] px-4 py-2.5 font-mono text-[11px]">
        <span className="font-semibold text-[#111214]">
          STITCH MULTI-STORE POS &amp; LEDGER MATRIX
        </span>
        <span className="text-[#0F3D91]">GOOGLE STITCH LOOP</span>
      </div>

      <div className="p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {STITCH_BRANCHES.map((branch, idx) => {
            const active = !compact && idx === branchIdx;
            return (
              <button
                key={branch.name}
                type="button"
                disabled={compact}
                onClick={() => setBranchIdx(idx)}
                className={`rounded border p-2.5 text-left transition-colors ${
                  active
                    ? "border-[#1D4ED8] bg-[#EFF4FF]"
                    : "border-[#E5E2DC] bg-[#FAF9F6] hover:border-[#D1CDC4]"
                } ${compact ? "cursor-default" : "btn-press cursor-pointer"}`}
              >
                <div className="text-xs font-semibold text-[#111214]">
                  {branch.name}
                </div>
                <div className="mt-1 font-mono text-[10px] text-[#4B4E54]">
                  {branch.skus}
                </div>
                <div className="mt-1.5 inline-block rounded border border-[#BBF7D0] bg-[#ECFDF5] px-1.5 py-0.5 font-mono text-[9.5px] font-medium text-[#15803D]">
                  {branch.posSync}
                </div>
              </button>
            );
          })}
        </div>

        {!compact && (
          <div className="mt-3 grid grid-cols-3 divide-x divide-[#E5E2DC] rounded border border-[#E5E2DC] bg-[#FAF9F6] font-mono text-[11px]">
            <div className="px-3 py-2">
              <div className="text-[10px] text-[#6E727A]">POS VARIANCE</div>
              <div className="font-semibold text-[#15803D]">{current.variance}</div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[10px] text-[#6E727A]">WORKFLOW STATE</div>
              <div className="font-semibold text-[#111214]">{current.restock}</div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[10px] text-[#6E727A]">AUDIT TRAIL</div>
              <div className="font-semibold text-[#0F3D91]">POSTGRES LEDGER</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. PRODUCTION E-COMMERCE BUILDS — Edge DNS & Storefront Pipeline            */
/* -------------------------------------------------------------------------- */
export function EcommerceSchematic({ compact = false }: SchematicProps) {
  const layers = [
    { step: "01", title: "Cloudflare DNS", meta: "Custom Domain & Edge TLS" },
    { step: "02", title: "Mobile-First UI", meta: "Next.js App Router" },
    { step: "03", title: "Automated Checkout", meta: "Order & Dispatch Hooks" },
    { step: "04", title: "Cloud Database", meta: "Catalog & Inventory State" },
  ];

  return (
    <div className="w-full overflow-hidden rounded-lg border border-[#E5E2DC] bg-white">
      <div className="flex items-center justify-between border-b border-[#E5E2DC] bg-[#FAF9F6] px-4 py-2.5 font-mono text-[11px]">
        <span className="font-semibold text-[#111214]">
          EDGE COMMERCE DEPLOYMENT PIPELINE
        </span>
        <span className="text-[#15803D]">2 LIVE STOREFRONTS</span>
      </div>

      <div className="swiss-grid-bg p-4">
        <div className={`grid grid-cols-2 gap-2 ${compact ? "" : "sm:grid-cols-4"}`}>
          {layers.map((layer) => (
            <div
              key={layer.step}
              className="rounded border border-[#E5E2DC] bg-white p-2.5"
            >
              <div className="font-mono text-[10px] font-semibold text-[#1D4ED8]">
                STAGE {layer.step}
              </div>
              <div className="mt-1 text-xs font-semibold text-[#111214]">
                {layer.title}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-[#6E727A]">
                {layer.meta}
              </div>
            </div>
          ))}
        </div>

        {!compact && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a
              href="https://blaireaesthetics.shop"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press flex items-center justify-between rounded border border-[#E5E2DC] bg-white px-3.5 py-2.5 font-mono text-xs text-[#111214] hover:border-[#1D4ED8] hover:text-[#0F3D91]"
            >
              <span>blaireaesthetics.shop</span>
              <span className="text-[10px] text-[#15803D]">LIVE</span>
            </a>
            <a
              href="https://aifycycle.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press flex items-center justify-between rounded border border-[#E5E2DC] bg-white px-3.5 py-2.5 font-mono text-xs text-[#111214] hover:border-[#1D4ED8] hover:text-[#0F3D91]"
            >
              <span>aifycycle.vercel.app</span>
              <span className="text-[10px] text-[#15803D]">LIVE</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
