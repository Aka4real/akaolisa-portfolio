import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { PROFILE } from "@/data/profile";
import {
  applyGeminiOverride,
  getGeminiConfig,
  getGeminiKeyFingerprint,
  probeGeminiModelChain,
} from "@/lib/gemini";
import { getAdminAuthConfigStatus } from "@/lib/admin/auth";
import {
  getAiRuntimeOverride,
  getStorageStatus,
  getTelemetryStore,
  saveHealthSnapshot,
} from "./store";
import type {
  EndpointProbeResult,
  HealthCheckSnapshot,
  IntegrationReadinessItem,
} from "./types";

const RESUME_FS_PATH = path.join(
  process.cwd(),
  "public",
  "resume",
  "Akaolisa-Enwedo-Resume.pdf"
);

function measureEventLoopLagMs(): Promise<number> {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    setTimeout(() => {
      const elapsedNs = Number(process.hrtime.bigint() - start);
      const elapsedMs = elapsedNs / 1_000_000;
      const lag = Math.max(0, Math.round((elapsedMs - 20) * 100) / 100);
      resolve(lag);
    }, 20);
  });
}

export async function inspectResumeAsset(): Promise<
  HealthCheckSnapshot["resumeAsset"]
> {
  try {
    const [stat, buf] = await Promise.all([
      fs.stat(RESUME_FS_PATH),
      fs.readFile(RESUME_FS_PATH),
    ]);
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    return {
      exists: stat.size > 0,
      path: PROFILE.resumePdfPath,
      sizeBytes: stat.size,
      sha256Short: hash.slice(0, 12),
      lastModified: stat.mtime.toISOString(),
    };
  } catch {
    return {
      exists: false,
      path: PROFILE.resumePdfPath,
      sizeBytes: 0,
      sha256Short: "missing",
    };
  }
}

interface ProbeSpec {
  id: string;
  label: string;
  path: string;
  category: EndpointProbeResult["category"];
}

const PROBE_TARGETS: ProbeSpec[] = [
  { id: "home", label: "Home Page", path: "/", category: "page" },
  { id: "work", label: "Selected Work", path: "/work", category: "page" },
  {
    id: "experience",
    label: "Experience & Lab",
    path: "/experience",
    category: "page",
  },
  { id: "contact", label: "Contact Workbench", path: "/contact", category: "page" },
  { id: "api_chat", label: "AI Chat Status API", path: "/api/chat", category: "api" },
  {
    id: "api_resume",
    label: "Resume PDF Stream API",
    path: "/api/resume?mode=view&probe=1",
    category: "api",
  },
  { id: "api_health", label: "Public Uptime API", path: "/api/health", category: "api" },
  { id: "sitemap", label: "Sitemap XML", path: "/sitemap.xml", category: "seo" },
  { id: "robots", label: "Robots.txt", path: "/robots.txt", category: "seo" },
  { id: "og", label: "OpenGraph Image", path: "/og-image.png", category: "asset" },
];

async function probeSingleEndpoint(
  origin: string,
  spec: ProbeSpec
): Promise<EndpointProbeResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const res = await fetch(`${origin}${spec.path}`, {
      method: "GET",
      headers: {
        "x-internal-probe": "1",
        "user-agent": "OXAKALABS-HealthProbe/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    const buf = await res.arrayBuffer();
    const latencyMs = Date.now() - start;
    const contentType = res.headers.get("content-type") ?? undefined;

    let status: EndpointProbeResult["status"] = "healthy";
    if (!res.ok) {
      status = res.status >= 500 ? "down" : "degraded";
    } else if (latencyMs > 1800) {
      status = "degraded";
    }

    return {
      id: spec.id,
      label: spec.label,
      path: spec.path,
      category: spec.category,
      status,
      httpStatus: res.status,
      latencyMs,
      contentType,
      bytes: buf.byteLength,
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      id: spec.id,
      label: spec.label,
      path: spec.path,
      category: spec.category,
      status: "down",
      httpStatus: 0,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Probe request failed",
    };
  }
}

export async function buildIntegrationsChecklist(
  resumeAsset: HealthCheckSnapshot["resumeAsset"]
): Promise<IntegrationReadinessItem[]> {
  const override = await getAiRuntimeOverride();
  const envGemini = getGeminiConfig();
  const effectiveGemini = applyGeminiOverride(envGemini, override);
  const storage = await getStorageStatus();
  const auth = getAdminAuthConfigStatus();
  const resendConfigured = Boolean((process.env.RESEND_API_KEY ?? "").trim());
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();

  return [
    {
      id: "gemini",
      name: "Google Gemini AI Assistant",
      envKey: "GEMINI_API_KEY",
      configured: Boolean(envGemini.apiKey),
      status: effectiveGemini.forceGroundedIndex
        ? "warning"
        : envGemini.apiKey
          ? "active"
          : "fallback",
      summary: effectiveGemini.forceGroundedIndex
        ? "Grounded Dossier Override Active"
        : envGemini.apiKey
          ? `Live (${effectiveGemini.primaryModel} · ${getGeminiKeyFingerprint()})`
          : "Deterministic Grounded Index Fallback",
      detail: `Chain: ${[effectiveGemini.primaryModel, ...effectiveGemini.fallbackModels].join(" → ")} · Thinking: ${effectiveGemini.thinkingLevel} · Max Tokens: ${effectiveGemini.maxOutputTokens}`,
    },
    {
      id: "storage",
      name: "Telemetry Persistence Store",
      envKey: "UPSTASH_REDIS_REST_URL",
      configured: storage.distributed || storage.durable,
      status: storage.distributed
        ? "active"
        : storage.durable
          ? "active"
          : "warning",
      summary: storage.label,
      detail: storage.distributed
        ? `Distributed across serverless instances (${storage.location})`
        : storage.durable
          ? `Atomic file persistence at ${storage.location}`
          : "Warm-instance storage only. Configure UPSTASH_REDIS_REST_URL + TOKEN for durable multi-instance Vercel persistence.",
    },
    {
      id: "resend",
      name: "Resend Transactional Email",
      envKey: "RESEND_API_KEY",
      configured: resendConfigured,
      status: resendConfigured ? "active" : "fallback",
      summary: resendConfigured
        ? "Direct SMTP Relay Active"
        : "Graceful Mailto + Admin Inbox Capture",
      detail: resendConfigured
        ? `Delivering to ${process.env.CONTACT_TO_EMAIL || PROFILE.email}`
        : "Inquiries are still captured in Admin Inquiries Inbox and provide one-click mailto fallback.",
    },
    {
      id: "admin_auth",
      name: "Admin Panel Security",
      envKey: "ADMIN_PASSWORD",
      configured: auth.passwordConfigured,
      status: auth.passwordConfigured
        ? auth.secretConfigured
          ? "active"
          : "warning"
        : auth.isProduction
          ? "error"
          : "warning",
      summary: auth.passwordConfigured
        ? auth.secretConfigured
          ? "Hardened Password + Custom HMAC Secret"
          : "Custom Password Set (Derived Signing Secret)"
        : "Local Dev Fallback Active",
      detail: auth.passwordConfigured
        ? "HttpOnly HMAC-SHA256 signed cookies + per-IP brute-force rate limiting active."
        : "Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET before deploying to production.",
    },
    {
      id: "resume_pdf",
      name: "Curriculum Vitae PDF Asset",
      envKey: "public/resume",
      configured: resumeAsset.exists,
      status: resumeAsset.exists ? "active" : "error",
      summary: resumeAsset.exists
        ? `${Math.round(resumeAsset.sizeBytes / 1024)} KB · SHA-256 ${resumeAsset.sha256Short}`
        : "PDF Asset Missing on Disk",
      detail: `Streamed via /api/resume with full view/download telemetry (${resumeAsset.path})`,
    },
    {
      id: "canonical_url",
      name: "Canonical Production Origin",
      envKey: "NEXT_PUBLIC_SITE_URL",
      configured: siteUrl.length > 0,
      status: siteUrl.length > 0 ? "active" : "fallback",
      summary: siteUrl || "Defaulting to https://www.oxakalabs.xyz",
      detail: "Used for canonical SEO tags, OpenGraph previews, sitemap, and robots.txt.",
    },
  ];
}

function collectRuntimeMetrics(eventLoopLagMs: number): HealthCheckSnapshot["runtime"] {
  const mem = process.memoryUsage();
  const toMb = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;
  const heapUsedMb = toMb(mem.heapUsed);
  const heapTotalMb = Math.max(1, toMb(mem.heapTotal));
  const heapPercent = Math.min(100, Math.round((heapUsedMb / heapTotalMb) * 100));

  const environment = process.env.VERCEL
    ? `Vercel (${process.env.VERCEL_ENV || "production"})`
    : process.env.COOLIFY_APP_ID || process.env.DOCKER_CONTAINER
      ? "Docker / Coolify Linux VPS"
      : process.env.NODE_ENV === "production"
        ? "Node.js Production Server"
        : "Local Development Server";

  const region =
    process.env.VERCEL_REGION ||
    process.env.FLY_REGION ||
    process.env.CLOUD_RUN_REGION ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "local";

  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment,
    region,
    uptimeSeconds: Math.round(process.uptime()),
    eventLoopLagMs,
    memory: {
      heapUsedMb,
      heapTotalMb,
      rssMb: toMb(mem.rss),
      externalMb: toMb(mem.external),
      heapPercent,
    },
  };
}

function computeCompositeHealthScore(params: {
  probes: EndpointProbeResult[];
  resumeExists: boolean;
  eventLoopLagMs: number;
  heapPercent: number;
  recentErrorRatePct: number;
  storageDurable: boolean;
}): { score: number; status: HealthCheckSnapshot["overallStatus"] } {
  let score = 100;

  if (params.probes.length > 0) {
    const downCount = params.probes.filter((p) => p.status === "down").length;
    const degradedCount = params.probes.filter((p) => p.status === "degraded").length;
    score -= downCount * 16;
    score -= degradedCount * 5;
  }

  if (!params.resumeExists) score -= 20;
  if (params.eventLoopLagMs > 120) score -= 12;
  else if (params.eventLoopLagMs > 50) score -= 5;

  if (params.heapPercent > 92) score -= 12;
  else if (params.heapPercent > 82) score -= 5;

  if (params.recentErrorRatePct > 10) score -= 15;
  else if (params.recentErrorRatePct > 3) score -= 6;

  if (!params.storageDurable) score -= 4;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const status: HealthCheckSnapshot["overallStatus"] =
    score >= 85 ? "operational" : score >= 60 ? "degraded" : "critical";

  return { score, status };
}

/**
 * Fast snapshot used inside every dashboard overview load (zero slow network calls).
 * Reuses last run endpoint & Gemini probe results while always computing fresh runtime/asset metrics.
 */
export async function buildFastHealthSnapshot(
  recentErrorRatePct: number
): Promise<HealthCheckSnapshot> {
  const [store, storage, resumeAsset, eventLoopLagMs] = await Promise.all([
    getTelemetryStore(),
    getStorageStatus(),
    inspectResumeAsset(),
    measureEventLoopLagMs(),
  ]);

  const integrations = await buildIntegrationsChecklist(resumeAsset);
  const runtime = collectRuntimeMetrics(eventLoopLagMs);
  const previous = store.lastHealthSnapshot;
  const probes = previous?.probes ?? [];

  const { score, status } = computeCompositeHealthScore({
    probes,
    resumeExists: resumeAsset.exists,
    eventLoopLagMs,
    heapPercent: runtime.memory.heapPercent,
    recentErrorRatePct,
    storageDurable: storage.durable,
  });

  return {
    checkedAt: previous?.checkedAt ?? Date.now(),
    overallStatus: status,
    score,
    probes,
    geminiProbes: previous?.geminiProbes,
    geminiProbeAt: previous?.geminiProbeAt,
    resumeAsset,
    runtime,
    integrations,
    storage,
  };
}

/**
 * Deep live diagnostic probe: tests all portfolio pages, API routes, SEO files,
 * resume asset stream, server runtime health, and optionally live Gemini model endpoints.
 */
export async function runDeepHealthProbe(params: {
  origin: string;
  probeGemini?: boolean;
}): Promise<HealthCheckSnapshot> {
  const [store, storage, resumeAsset, eventLoopLagMs, probes, override] =
    await Promise.all([
      getTelemetryStore(),
      getStorageStatus(),
      inspectResumeAsset(),
      measureEventLoopLagMs(),
      Promise.all(
        PROBE_TARGETS.map((spec) => probeSingleEndpoint(params.origin, spec))
      ),
      getAiRuntimeOverride(),
    ]);

  let geminiProbes = store.lastHealthSnapshot?.geminiProbes;
  let geminiProbeAt = store.lastHealthSnapshot?.geminiProbeAt;

  if (params.probeGemini) {
    geminiProbes = await probeGeminiModelChain(override);
    geminiProbeAt = Date.now();
  }

  const integrations = await buildIntegrationsChecklist(resumeAsset);
  const runtime = collectRuntimeMetrics(eventLoopLagMs);

  const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recentEvents = store.events.filter((e) => e.timestamp >= recentCutoff);
  const recentErrors = recentEvents.filter((e) => e.severity === "error").length;
  const recentErrorRatePct =
    recentEvents.length > 0 ? (recentErrors / recentEvents.length) * 100 : 0;

  const { score, status } = computeCompositeHealthScore({
    probes,
    resumeExists: resumeAsset.exists,
    eventLoopLagMs,
    heapPercent: runtime.memory.heapPercent,
    recentErrorRatePct,
    storageDurable: storage.durable,
  });

  const snapshot: HealthCheckSnapshot = {
    checkedAt: Date.now(),
    overallStatus: status,
    score,
    probes,
    geminiProbes,
    geminiProbeAt,
    resumeAsset,
    runtime,
    integrations,
    storage,
  };

  await saveHealthSnapshot(snapshot);
  return snapshot;
}
