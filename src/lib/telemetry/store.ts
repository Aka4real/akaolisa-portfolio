import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import type {
  ActiveVisitorPresence,
  AdminAuditEntry,
  AiRoutingLogEntry,
  AiRuntimeOverride,
  ContactInquiryRecord,
  GeoInfo,
  HealthCheckSnapshot,
  IpAnnotation,
  IpTag,
  StorageStatusInfo,
  TelemetryEvent,
  TelemetryStoreData,
} from "./types";
import {
  buildUnknownGeo,
  extractEdgeGeoFromHeaders,
  lookupPublicIpGeo,
} from "./ip";

const STORE_SCHEMA_VERSION = 1;
const UPSTASH_STORE_KEY = "oxakalabs:portfolio:telemetry:v1";
const UPSTASH_AI_OVERRIDE_KEY = "oxakalabs:portfolio:ai-override:v1";

const MAX_EVENTS = 8000;
const MAX_AI_LOGS = 1500;
const MAX_INQUIRIES = 500;
const MAX_AUDIT_LOGS = 1000;
const MAX_GEO_CACHE = 1500;
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ACTIVE_PRESENCE_RETENTION_MS = 15 * 60 * 1000;
const UPSTASH_SYNC_MIN_INTERVAL_MS = 2500;

interface UpstashConfig {
  url: string;
  token: string;
}

interface TelemetryRuntimeSingleton {
  data: TelemetryStoreData | null;
  loaded: boolean;
  loadingPromise: Promise<TelemetryStoreData> | null;
  writeChain: Promise<void>;
  driver: StorageStatusInfo["driver"];
  location: string;
  lastSavedAt: number | null;
  lastError: string | null;
  lastRemoteHydrateAt: number;
  pendingGeoLookups: Map<string, Promise<GeoInfo>>;
}

declare global {
  var __akaolisaTelemetryRuntime__: TelemetryRuntimeSingleton | undefined;
}

function getSingleton(): TelemetryRuntimeSingleton {
  if (!globalThis.__akaolisaTelemetryRuntime__) {
    globalThis.__akaolisaTelemetryRuntime__ = {
      data: null,
      loaded: false,
      loadingPromise: null,
      writeChain: Promise.resolve(),
      driver: "memory-only",
      location: "in-memory",
      lastSavedAt: null,
      lastError: null,
      lastRemoteHydrateAt: 0,
      pendingGeoLookups: new Map(),
    };
  }
  return globalThis.__akaolisaTelemetryRuntime__;
}

function createEmptyStore(): TelemetryStoreData {
  const now = Date.now();
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    events: [],
    activePresence: {},
    aiLogs: [],
    inquiries: [],
    ipAnnotations: {},
    ipGeoCache: {},
    aiOverride: null,
    lastHealthSnapshot: null,
    auditLogs: [],
    revokedSessions: {},
  };
}

function getUpstashConfig(): UpstashConfig | null {
  const url = (
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.KV_REST_API_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.KV_REST_API_TOKEN ??
    ""
  ).trim();

  if (url && token) {
    return { url, token };
  }
  return null;
}

function resolveDiskPaths(): { primaryPath: string; fallbackTmpPath: string } {
  const customDir = (process.env.TELEMETRY_DATA_DIR ?? "").trim();
  const primaryDir = customDir
    ? path.resolve(customDir)
    : path.join(process.cwd(), ".telemetry-data");
  const fallbackDir = path.join(os.tmpdir(), "akaolisa-portfolio-telemetry");
  return {
    primaryPath: path.join(primaryDir, "telemetry-store.json"),
    fallbackTmpPath: path.join(fallbackDir, "telemetry-store.json"),
  };
}

function normalizeLoadedStore(raw: unknown): TelemetryStoreData {
  const base = createEmptyStore();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Partial<TelemetryStoreData>;
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    createdAt: typeof obj.createdAt === "number" ? obj.createdAt : base.createdAt,
    updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : base.updatedAt,
    events: Array.isArray(obj.events) ? obj.events.slice(-MAX_EVENTS) : [],
    activePresence:
      obj.activePresence && typeof obj.activePresence === "object"
        ? obj.activePresence
        : {},
    aiLogs: Array.isArray(obj.aiLogs) ? obj.aiLogs.slice(-MAX_AI_LOGS) : [],
    inquiries: Array.isArray(obj.inquiries)
      ? obj.inquiries.slice(-MAX_INQUIRIES)
      : [],
    ipAnnotations:
      obj.ipAnnotations && typeof obj.ipAnnotations === "object"
        ? obj.ipAnnotations
        : {},
    ipGeoCache:
      obj.ipGeoCache && typeof obj.ipGeoCache === "object" ? obj.ipGeoCache : {},
    aiOverride: obj.aiOverride ?? null,
    lastHealthSnapshot: obj.lastHealthSnapshot ?? null,
    auditLogs: Array.isArray(obj.auditLogs)
      ? obj.auditLogs.slice(-MAX_AUDIT_LOGS)
      : [],
    revokedSessions:
      obj.revokedSessions && typeof obj.revokedSessions === "object"
        ? obj.revokedSessions
        : {},
  };
}

interface AiOverrideEnvelope {
  version: number;
  override: AiRuntimeOverride | null;
  updatedAt: number;
}

function parseAiOverrideEnvelope(
  raw: string | null | undefined
): { exists: true; override: AiRuntimeOverride | null } | { exists: false } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { exists: false };
  }
  try {
    const parsed = JSON.parse(raw) as
      | Partial<AiOverrideEnvelope>
      | AiRuntimeOverride
      | null;
    if (parsed && typeof parsed === "object" && "override" in parsed) {
      return {
        exists: true,
        override: (parsed.override ?? null) as AiRuntimeOverride | null,
      };
    }
    if (parsed && typeof parsed === "object" && "enabled" in parsed) {
      return { exists: true, override: parsed as AiRuntimeOverride };
    }
    return { exists: true, override: null };
  } catch {
    return { exists: false };
  }
}

async function readAiOverrideFromUpstash(
  cfg: UpstashConfig
): Promise<
  | { ok: true; exists: boolean; override: AiRuntimeOverride | null }
  | { ok: false }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(
      `${cfg.url}/get/${encodeURIComponent(UPSTASH_AI_OVERRIDE_KEY)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
        },
        signal: controller.signal,
        cache: "no-store",
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as { result?: string | null };
    const parsed = parseAiOverrideEnvelope(json.result);
    if (parsed.exists) {
      return { ok: true, exists: true, override: parsed.override };
    }
    return { ok: true, exists: false, override: null };
  } catch {
    clearTimeout(timeout);
    return { ok: false };
  }
}

async function writeAiOverrideToUpstash(
  cfg: UpstashConfig,
  override: AiRuntimeOverride | null
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const envelope: AiOverrideEnvelope = {
      version: 1,
      override,
      updatedAt: Date.now(),
    };
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["SET", UPSTASH_AI_OVERRIDE_KEY, JSON.stringify(envelope)],
      ]),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

async function readFromUpstash(
  cfg: UpstashConfig
): Promise<TelemetryStoreData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["GET", UPSTASH_STORE_KEY],
        ["GET", UPSTASH_AI_OVERRIDE_KEY],
      ]),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{
      result?: string | null;
      error?: string;
    }>;
    if (
      !Array.isArray(json) ||
      json.length < 2 ||
      json[0]?.error ||
      json[1]?.error
    ) {
      return null;
    }

    const rawStore = json[0]?.result;
    const store = rawStore
      ? normalizeLoadedStore(JSON.parse(rawStore))
      : createEmptyStore();

    // Dedicated override key is always authoritative over the telemetry blob
    const dedicatedOverride = parseAiOverrideEnvelope(json[1]?.result);
    if (dedicatedOverride.exists) {
      store.aiOverride = dedicatedOverride.override;
    }

    return store;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function writeToUpstash(
  cfg: UpstashConfig,
  data: TelemetryStoreData
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const serialized = JSON.stringify(data);
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([["SET", UPSTASH_STORE_KEY, serialized]]),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

async function readFromDisk(filePath: string): Promise<TelemetryStoreData | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    if (!raw.trim()) return createEmptyStore();
    return normalizeLoadedStore(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      return null;
    }
    return null;
  }
}

async function writeAtomicDisk(
  filePath: string,
  data: TelemetryStoreData
): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmpFile = `${filePath}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(data), "utf8");
  await fs.rename(tmpFile, filePath);
}

async function hydrateStore(forceRemote = false): Promise<TelemetryStoreData> {
  const runtime = getSingleton();
  const upstash = getUpstashConfig();

  // In distributed Upstash mode, periodically refresh from Redis so multi-instance reads stay fresh
  if (
    runtime.loaded &&
    runtime.data &&
    (!upstash ||
      (!forceRemote &&
        Date.now() - runtime.lastRemoteHydrateAt < UPSTASH_SYNC_MIN_INTERVAL_MS))
  ) {
    return runtime.data;
  }

  if (runtime.loadingPromise) {
    return runtime.loadingPromise;
  }

  runtime.loadingPromise = (async () => {
    try {
      // Tier 1: Distributed Upstash Redis / Vercel KV
      if (upstash) {
        const remote = await readFromUpstash(upstash);
        if (remote) {
          runtime.data = remote;
          runtime.loaded = true;
          runtime.driver = "upstash-redis";
          runtime.location = `${new URL(upstash.url).host} (${UPSTASH_STORE_KEY})`;
          runtime.lastRemoteHydrateAt = Date.now();
          runtime.lastError = null;
          return remote;
        }
        runtime.lastError = "Upstash REST unreachable; fell back to local storage";
      }

      // Tier 2: Durable Local Filesystem (.telemetry-data/ or TELEMETRY_DATA_DIR)
      const { primaryPath, fallbackTmpPath } = resolveDiskPaths();
      const isVercel = Boolean(process.env.VERCEL);

      if (!isVercel) {
        const existing = await readFromDisk(primaryPath);
        if (existing) {
          runtime.data = existing;
          runtime.loaded = true;
          runtime.driver = "local-disk";
          runtime.location = primaryPath;
          return existing;
        }

        const fresh = runtime.data ?? createEmptyStore();
        try {
          await writeAtomicDisk(primaryPath, fresh);
          runtime.data = fresh;
          runtime.loaded = true;
          runtime.driver = "local-disk";
          runtime.location = primaryPath;
          runtime.lastSavedAt = Date.now();
          return fresh;
        } catch {
          // Fall through to tmp disk
        }
      }

      // Tier 2b: /tmp warm serverless disk
      const existingTmp = await readFromDisk(fallbackTmpPath);
      if (existingTmp) {
        runtime.data = existingTmp;
        runtime.loaded = true;
        runtime.driver = "tmp-disk";
        runtime.location = fallbackTmpPath;
        return existingTmp;
      }

      const fresh = runtime.data ?? createEmptyStore();
      try {
        await writeAtomicDisk(fallbackTmpPath, fresh);
        runtime.data = fresh;
        runtime.loaded = true;
        runtime.driver = "tmp-disk";
        runtime.location = fallbackTmpPath;
        runtime.lastSavedAt = Date.now();
        return fresh;
      } catch (err) {
        runtime.data = fresh;
        runtime.loaded = true;
        runtime.driver = "memory-only";
        runtime.location = "globalThis ring buffer";
        runtime.lastError =
          err instanceof Error ? err.message : "Filesystem read-only";
        return fresh;
      }
    } finally {
      runtime.loadingPromise = null;
    }
  })();

  return runtime.loadingPromise;
}

async function persistStore(data: TelemetryStoreData): Promise<void> {
  const runtime = getSingleton();
  data.updatedAt = Date.now();

  // Prune stale active presence & expired revoked sessions
  const presenceCutoff = Date.now() - ACTIVE_PRESENCE_RETENTION_MS;
  for (const [sid, p] of Object.entries(data.activePresence)) {
    if (p.lastSeenAt < presenceCutoff) {
      delete data.activePresence[sid];
    }
  }
  const now = Date.now();
  for (const [sid, exp] of Object.entries(data.revokedSessions)) {
    if (exp < now) {
      delete data.revokedSessions[sid];
    }
  }

  const upstash = getUpstashConfig();
  if (upstash) {
    const ok = await writeToUpstash(upstash, data);
    if (ok) {
      runtime.driver = "upstash-redis";
      runtime.location = `${new URL(upstash.url).host} (${UPSTASH_STORE_KEY})`;
      runtime.lastSavedAt = Date.now();
      runtime.lastRemoteHydrateAt = Date.now();
      runtime.lastError = null;
      return;
    }
    runtime.lastError = "Upstash write failed; persisted locally as fallback";
  }

  const { primaryPath, fallbackTmpPath } = resolveDiskPaths();
  if (runtime.driver === "local-disk" || (!process.env.VERCEL && runtime.driver !== "tmp-disk")) {
    try {
      await writeAtomicDisk(primaryPath, data);
      runtime.driver = "local-disk";
      runtime.location = primaryPath;
      runtime.lastSavedAt = Date.now();
      runtime.lastError = null;
      return;
    } catch {
      // Fallback to tmp
    }
  }

  try {
    await writeAtomicDisk(fallbackTmpPath, data);
    runtime.driver = "tmp-disk";
    runtime.location = fallbackTmpPath;
    runtime.lastSavedAt = Date.now();
  } catch (err) {
    runtime.driver = "memory-only";
    runtime.lastError =
      err instanceof Error ? err.message : "Disk persistence unavailable";
  }
}

function enqueueMutation<T>(
  mutator: (store: TelemetryStoreData) => T | Promise<T>
): Promise<T> {
  const runtime = getSingleton();
  const next = runtime.writeChain.then(async () => {
    const store = await hydrateStore(Boolean(getUpstashConfig()));
    const result = await mutator(store);
    await persistStore(store);
    return result;
  });

  runtime.writeChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export function generateTelemetryId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

export async function getTelemetryStore(
  options?: { forceRemote?: boolean }
): Promise<TelemetryStoreData> {
  return hydrateStore(Boolean(options?.forceRemote));
}

export async function resolveGeoWithCache(
  ip: string,
  headers: Headers
): Promise<GeoInfo> {
  // 1. Edge headers win immediately (zero latency, exact edge geo)
  const edgeGeo = extractEdgeGeoFromHeaders(ip, headers);
  if (edgeGeo) return edgeGeo;

  // 2. Check cached geo entry in store
  const store = await hydrateStore(false);
  const cached = store.ipGeoCache[ip];
  if (cached && Date.now() - cached.cachedAt < GEO_CACHE_TTL_MS) {
    return cached.geo;
  }

  // 3. Deduplicated non-blocking fallback lookup for public IPs without edge headers
  const runtime = getSingleton();
  const inflight = runtime.pendingGeoLookups.get(ip);
  if (inflight) return inflight;

  const lookupPromise = (async () => {
    try {
      const lookedUp = await lookupPublicIpGeo(ip);
      const finalGeo = lookedUp ?? buildUnknownGeo(ip);
      await enqueueMutation((s) => {
        s.ipGeoCache[ip] = { geo: finalGeo, cachedAt: Date.now() };
        const keys = Object.keys(s.ipGeoCache);
        if (keys.length > MAX_GEO_CACHE) {
          const oldest = keys
            .sort((a, b) => s.ipGeoCache[a].cachedAt - s.ipGeoCache[b].cachedAt)
            .slice(0, keys.length - MAX_GEO_CACHE);
          for (const k of oldest) delete s.ipGeoCache[k];
        }
      });
      return finalGeo;
    } finally {
      runtime.pendingGeoLookups.delete(ip);
    }
  })();

  runtime.pendingGeoLookups.set(ip, lookupPromise);
  return lookupPromise;
}

export async function recordTelemetryEvent(
  event: Omit<TelemetryEvent, "id"> & { id?: string }
): Promise<TelemetryEvent> {
  const fullEvent: TelemetryEvent = {
    ...event,
    id: event.id ?? generateTelemetryId("evt"),
  };

  await enqueueMutation((store) => {
    store.events.push(fullEvent);
    if (store.events.length > MAX_EVENTS) {
      store.events.splice(0, store.events.length - MAX_EVENTS);
    }
  });

  return fullEvent;
}

export async function recordTelemetryBatchAndPresence(params: {
  events: Array<Omit<TelemetryEvent, "id"> & { id?: string }>;
  presence?: ActiveVisitorPresence;
}): Promise<void> {
  await enqueueMutation((store) => {
    for (const ev of params.events) {
      store.events.push({
        ...ev,
        id: ev.id ?? generateTelemetryId("evt"),
      });
    }
    if (store.events.length > MAX_EVENTS) {
      store.events.splice(0, store.events.length - MAX_EVENTS);
    }

    if (params.presence) {
      const existing = store.activePresence[params.presence.sessionId];
      store.activePresence[params.presence.sessionId] = {
        ...params.presence,
        firstSeenAt: existing?.firstSeenAt ?? params.presence.firstSeenAt,
        pageViewsInSession: Math.max(
          existing?.pageViewsInSession ?? 0,
          params.presence.pageViewsInSession
        ),
        resumeViewStartedAt: params.presence.isViewingResume
          ? existing?.resumeViewStartedAt ??
            params.presence.resumeViewStartedAt ??
            Date.now()
          : undefined,
      };
    }
  });
}

export async function recordAiRoutingLog(
  entry: Omit<AiRoutingLogEntry, "id"> & { id?: string }
): Promise<AiRoutingLogEntry> {
  const fullEntry: AiRoutingLogEntry = {
    ...entry,
    id: entry.id ?? generateTelemetryId("ai"),
  };

  await enqueueMutation((store) => {
    store.aiLogs.push(fullEntry);
    if (store.aiLogs.length > MAX_AI_LOGS) {
      store.aiLogs.splice(0, store.aiLogs.length - MAX_AI_LOGS);
    }
  });

  return fullEntry;
}

export async function recordContactInquiry(
  inquiry: Omit<ContactInquiryRecord, "id" | "reviewed"> & {
    id?: string;
    reviewed?: boolean;
  }
): Promise<ContactInquiryRecord> {
  const full: ContactInquiryRecord = {
    ...inquiry,
    id: inquiry.id ?? generateTelemetryId("inq"),
    reviewed: inquiry.reviewed ?? false,
  };

  await enqueueMutation((store) => {
    store.inquiries.push(full);
    if (store.inquiries.length > MAX_INQUIRIES) {
      store.inquiries.splice(0, store.inquiries.length - MAX_INQUIRIES);
    }
  });

  return full;
}

export async function markInquiryReviewed(
  id: string,
  reviewed: boolean
): Promise<boolean> {
  return enqueueMutation((store) => {
    const found = store.inquiries.find((item) => item.id === id);
    if (!found) return false;
    found.reviewed = reviewed;
    return true;
  });
}

export async function recordAdminAudit(
  entry: Omit<AdminAuditEntry, "id" | "timestamp">
): Promise<AdminAuditEntry> {
  const full: AdminAuditEntry = {
    ...entry,
    id: generateTelemetryId("aud"),
    timestamp: Date.now(),
  };

  await enqueueMutation((store) => {
    store.auditLogs.push(full);
    if (store.auditLogs.length > MAX_AUDIT_LOGS) {
      store.auditLogs.splice(0, store.auditLogs.length - MAX_AUDIT_LOGS);
    }
  });

  return full;
}

export async function setIpAnnotation(params: {
  ip: string;
  tag?: IpTag;
  note?: string;
  blocked?: boolean;
}): Promise<IpAnnotation> {
  return enqueueMutation((store) => {
    const prev = store.ipAnnotations[params.ip];
    const next: IpAnnotation = {
      ip: params.ip,
      tag: params.tag ?? prev?.tag ?? "none",
      note: (params.note ?? prev?.note ?? "").slice(0, 300),
      blocked:
        typeof params.blocked === "boolean"
          ? params.blocked
          : params.tag === "blocked"
            ? true
            : prev?.blocked ?? false,
      updatedAt: Date.now(),
    };
    if (next.blocked && next.tag === "none") {
      next.tag = "blocked";
    }
    if (!next.blocked && next.tag === "blocked") {
      next.tag = "none";
    }
    store.ipAnnotations[params.ip] = next;
    return next;
  });
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  const store = await hydrateStore(false);
  const ann = store.ipAnnotations[ip];
  return Boolean(ann?.blocked || ann?.tag === "blocked");
}

export async function getAiRuntimeOverride(): Promise<AiRuntimeOverride | null> {
  const upstash = getUpstashConfig();
  if (upstash) {
    const dedicated = await readAiOverrideFromUpstash(upstash);
    if (dedicated.ok && dedicated.exists) {
      const runtime = getSingleton();
      if (runtime.data) {
        runtime.data.aiOverride = dedicated.override;
      }
      return dedicated.override;
    }
  }

  const store = await hydrateStore(false);
  return store.aiOverride;
}

export async function setAiRuntimeOverride(
  override: AiRuntimeOverride | null
): Promise<AiRuntimeOverride | null> {
  const upstash = getUpstashConfig();
  if (upstash) {
    await writeAiOverrideToUpstash(upstash, override);
    const runtime = getSingleton();
    if (runtime.data) {
      runtime.data.aiOverride = override;
    }
  }

  return enqueueMutation((store) => {
    store.aiOverride = override;
    return store.aiOverride;
  });
}

export async function saveHealthSnapshot(
  snapshot: HealthCheckSnapshot
): Promise<void> {
  await enqueueMutation((store) => {
    store.lastHealthSnapshot = snapshot;
  });
}

export async function revokeAdminSession(
  sessionId: string,
  expiresAtMs: number
): Promise<void> {
  await enqueueMutation((store) => {
    store.revokedSessions[sessionId] = expiresAtMs;
  });
}

export async function revokeAllAdminSessionsBefore(
  timestampMs: number
): Promise<void> {
  await enqueueMutation((store) => {
    store.revokedSessions["__revoke_all_before__"] = timestampMs;
  });
}

export async function isAdminSessionRevoked(
  sessionId: string,
  issuedAtMs: number
): Promise<boolean> {
  const store = await hydrateStore(false);
  if (store.revokedSessions[sessionId]) return true;
  const globalCutoff = store.revokedSessions["__revoke_all_before__"];
  if (typeof globalCutoff === "number" && issuedAtMs < globalCutoff) {
    return true;
  }
  return false;
}

export async function pruneTelemetryStore(options: {
  olderThanDays?: number;
  clearErrorsOnly?: boolean;
  resetAll?: boolean;
}): Promise<{ removedEvents: number; removedAiLogs: number }> {
  return enqueueMutation((store) => {
    if (options.resetAll) {
      const removedEvents = store.events.length;
      const removedAiLogs = store.aiLogs.length;
      store.events = [];
      store.activePresence = {};
      store.aiLogs = [];
      store.inquiries = [];
      return { removedEvents, removedAiLogs };
    }

    if (options.clearErrorsOnly) {
      const before = store.events.length;
      store.events = store.events.filter(
        (ev) =>
          ev.type !== "client_error" &&
          ev.type !== "not_found" &&
          ev.severity !== "error"
      );
      return { removedEvents: before - store.events.length, removedAiLogs: 0 };
    }

    const days = Math.max(1, options.olderThanDays ?? 30);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const beforeEvents = store.events.length;
    const beforeAi = store.aiLogs.length;
    store.events = store.events.filter((ev) => ev.timestamp >= cutoff);
    store.aiLogs = store.aiLogs.filter((log) => log.timestamp >= cutoff);
    return {
      removedEvents: beforeEvents - store.events.length,
      removedAiLogs: beforeAi - store.aiLogs.length,
    };
  });
}

export async function getStorageStatus(): Promise<StorageStatusInfo> {
  const store = await hydrateStore(false);
  const runtime = getSingleton();
  const estimatedBytes = Buffer.byteLength(JSON.stringify(store), "utf8");

  const labelMap: Record<StorageStatusInfo["driver"], string> = {
    "upstash-redis": "Upstash Redis / Vercel KV (Distributed)",
    "local-disk": "Local Disk Persistence (VPS / Docker / Dev)",
    "tmp-disk": "Serverless /tmp Warm Cache",
    "memory-only": "In-Memory Ring Buffer",
  };

  return {
    driver: runtime.driver,
    label: labelMap[runtime.driver],
    durable: runtime.driver === "upstash-redis" || runtime.driver === "local-disk",
    distributed: runtime.driver === "upstash-redis",
    location: runtime.location,
    lastSavedAt: runtime.lastSavedAt,
    lastError: runtime.lastError,
    eventCount: store.events.length,
    estimatedBytes,
  };
}
