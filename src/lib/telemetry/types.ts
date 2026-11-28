import type { GeminiThinkingLevel } from "@/lib/gemini";

export type TelemetryEventType =
  | "page_view"
  | "page_leave"
  | "resume_modal_open"
  | "resume_modal_close"
  | "resume_new_tab"
  | "resume_download"
  | "resume_direct_view"
  | "assistant_open"
  | "ai_chat"
  | "contact_submit"
  | "email_copy"
  | "whatsapp_click"
  | "outbound_click"
  | "project_interaction"
  | "web_vitals"
  | "client_error"
  | "api_request"
  | "not_found"
  | "security_event"
  | "admin_audit";

export type TelemetrySeverity = "info" | "success" | "warn" | "error";

export type TrafficClass =
  | "human"
  | "bot"
  | "crawler"
  | "preview_scraper"
  | "automation";

export type DeviceType = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

export type IpTag =
  | "none"
  | "owner"
  | "recruiter"
  | "lead"
  | "vip"
  | "watched"
  | "blocked"
  | "bot";

export type ResumeAccessSource =
  | "modal"
  | "experience"
  | "contact"
  | "header"
  | "footer"
  | "direct"
  | "newtab"
  | "unknown";

export interface GeoInfo {
  country: string;
  countryName: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  asn?: string;
  org?: string;
  isPrivate: boolean;
  source: "vercel-edge" | "cloudflare-edge" | "geo-api" | "private" | "unknown";
}

export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: DeviceType;
  trafficClass: TrafficClass;
  botName?: string;
  userAgent: string;
}

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface WebVitalsMetric {
  ttfb?: number;
  fcp?: number;
  lcp?: number;
  cls?: number;
  loadTime?: number;
  domInteractive?: number;
}

export interface TelemetryEvent {
  id: string;
  timestamp: number;
  type: TelemetryEventType;
  severity: TelemetrySeverity;
  ip: string;
  visitorId: string;
  sessionId: string;
  path: string;
  queryString?: string;
  referrer?: string;
  referrerDomain?: string;
  utm?: UtmParams;
  geo: GeoInfo;
  device: DeviceInfo;
  durationMs?: number;
  scrollDepth?: number;
  statusCode?: number;
  latencyMs?: number;
  label?: string;
  source?: string;
  meta?: Record<string, unknown>;
}

export interface ActiveVisitorPresence {
  sessionId: string;
  visitorId: string;
  ip: string;
  geo: GeoInfo;
  device: DeviceInfo;
  currentPath: string;
  firstSeenAt: number;
  lastSeenAt: number;
  pageViewsInSession: number;
  scrollDepth: number;
  visibilityState: "visible" | "hidden";
  isViewingResume: boolean;
  resumeViewStartedAt?: number;
  isAssistantOpen: boolean;
  referrerDomain?: string;
  viewport?: string;
  language?: string;
  networkType?: string;
}

export interface GeminiAttemptTrace {
  model: string;
  status:
    | "success"
    | "http_error"
    | "timeout"
    | "empty"
    | "network_error"
    | "auth_error"
    | "skipped";
  httpStatus?: number;
  errorStatus?: string;
  errorMessage?: string;
  latencyMs: number;
  thinkingConfigApplied: boolean;
  startedAt: number;
}

export interface GeminiTokenUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

export interface AiRoutingLogEntry {
  id: string;
  timestamp: number;
  ip: string;
  visitorId: string;
  sessionId: string;
  geo: GeoInfo;
  query: string;
  answerPreview: string;
  mode: "gemini" | "grounded-index";
  configuredPrimary: string;
  resolvedModel: string;
  wasFailover: boolean;
  failoverDepth: number;
  overrideActive: boolean;
  attempts: GeminiAttemptTrace[];
  latencyMs: number;
  usage?: GeminiTokenUsage;
  finishReason?: string;
  errorSummary?: string;
}

export interface ContactInquiryRecord {
  id: string;
  timestamp: number;
  ip: string;
  geo: GeoInfo;
  name: string;
  email: string;
  track: string;
  scope: string;
  message: string;
  status: "sent" | "fallback" | "honeypot_blocked" | "validation_error";
  deliveryMode: "resend" | "fallback" | "blocked" | "error";
  reviewed: boolean;
}

export interface IpAnnotation {
  ip: string;
  tag: IpTag;
  note: string;
  blocked: boolean;
  updatedAt: number;
}

export interface AiRuntimeOverride {
  enabled: boolean;
  primaryModel?: string;
  fallbackModels?: string[];
  thinkingLevel?: GeminiThinkingLevel;
  maxOutputTokens?: number;
  forceGroundedIndex?: boolean;
  updatedAt: number;
  updatedBy: string;
}

export interface AdminAuditEntry {
  id: string;
  timestamp: number;
  ip: string;
  action: string;
  status: "success" | "denied" | "error";
  details: string;
  userAgent: string;
}

export interface EndpointProbeResult {
  id: string;
  label: string;
  path: string;
  category: "page" | "api" | "asset" | "seo";
  status: "healthy" | "degraded" | "down";
  httpStatus: number;
  latencyMs: number;
  contentType?: string;
  bytes?: number;
  error?: string;
}

export interface GeminiModelProbeResult {
  model: string;
  role: "primary" | "fallback";
  status: "reachable" | "degraded" | "error" | "unconfigured";
  httpStatus?: number;
  latencyMs: number;
  displayName?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  error?: string;
}

export interface IntegrationReadinessItem {
  id: string;
  name: string;
  envKey: string;
  configured: boolean;
  status: "active" | "fallback" | "warning" | "error";
  summary: string;
  detail: string;
}

export interface StorageStatusInfo {
  driver: "upstash-redis" | "local-disk" | "tmp-disk" | "memory-only";
  label: string;
  durable: boolean;
  distributed: boolean;
  location: string;
  lastSavedAt: number | null;
  lastError: string | null;
  eventCount: number;
  estimatedBytes: number;
}

export interface HealthCheckSnapshot {
  checkedAt: number;
  overallStatus: "operational" | "degraded" | "critical";
  score: number;
  probes: EndpointProbeResult[];
  geminiProbes?: GeminiModelProbeResult[];
  geminiProbeAt?: number;
  resumeAsset: {
    exists: boolean;
    path: string;
    sizeBytes: number;
    sha256Short: string;
    lastModified?: string;
  };
  runtime: {
    nodeVersion: string;
    platform: string;
    arch: string;
    environment: string;
    region: string;
    uptimeSeconds: number;
    eventLoopLagMs: number;
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
      externalMb: number;
      heapPercent: number;
    };
  };
  integrations: IntegrationReadinessItem[];
  storage: StorageStatusInfo;
}

export interface CachedIpGeo {
  geo: GeoInfo;
  cachedAt: number;
}

export interface TelemetryStoreData {
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  events: TelemetryEvent[];
  activePresence: Record<string, ActiveVisitorPresence>;
  aiLogs: AiRoutingLogEntry[];
  inquiries: ContactInquiryRecord[];
  ipAnnotations: Record<string, IpAnnotation>;
  ipGeoCache: Record<string, CachedIpGeo>;
  aiOverride: AiRuntimeOverride | null;
  lastHealthSnapshot: HealthCheckSnapshot | null;
  auditLogs: AdminAuditEntry[];
  revokedSessions: Record<string, number>;
}

/* -------------------------------------------------------------------------- */
/*  Aggregated Dashboard Snapshot Contracts                                   */
/* -------------------------------------------------------------------------- */

export type TimeRangeKey = "15m" | "24h" | "7d" | "30d" | "all";
export type TrafficFilterKey = "all" | "human" | "bot";

export interface IpProfile {
  ip: string;
  visitCount: number;
  pageViews: number;
  totalEvents: number;
  resumeViews: number;
  resumeNewTabs: number;
  resumeDownloads: number;
  resumeViewDurationMs: number;
  aiQueries: number;
  contactInquiries: number;
  outboundClicks: number;
  errorCount: number;
  notFoundCount: number;
  totalActiveMs: number;
  avgScrollDepth: number;
  isOnlineNow: boolean;
  isViewingResumeNow: boolean;
  isAssistantOpenNow: boolean;
  currentPath?: string;
  firstSeenAt: number;
  lastSeenAt: number;
  landingPage: string;
  topReferrer: string;
  pagesVisited: Array<{ path: string; count: number }>;
  geo: GeoInfo;
  device: DeviceInfo;
  annotation: IpAnnotation;
}

export interface IpForensicDossier {
  profile: IpProfile;
  sessions: Array<{
    sessionId: string;
    startedAt: number;
    lastSeenAt: number;
    durationMs: number;
    eventCount: number;
    pages: string[];
    viewedResume: boolean;
    downloadedResume: boolean;
    usedAi: boolean;
    submittedContact: boolean;
  }>;
  events: TelemetryEvent[];
  aiLogs: AiRoutingLogEntry[];
  inquiries: ContactInquiryRecord[];
}

export interface TimeSeriesPoint {
  bucketStart: number;
  label: string;
  visits: number;
  uniqueIps: number;
  pageViews: number;
  resumeViews: number;
  resumeDownloads: number;
  aiQueries: number;
  errors: number;
}

export interface ModelRoutingStats {
  model: string;
  displayLabel: string;
  role: "primary" | "fallback" | "grounded-engine" | "override" | "other";
  status: "active-primary" | "active-failover" | "standby" | "degraded" | "fallback-engine";
  requestsServed: number;
  attemptsTotal: number;
  failures: number;
  successRate: number;
  trafficSharePct: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  promptTokens: number;
  outputTokens: number;
  thoughtTokens: number;
  totalTokens: number;
  lastServedAt: number | null;
  lastErrorAt: number | null;
  lastErrorMessage?: string;
}

export interface PagePerformanceRow {
  path: string;
  views: number;
  uniqueIps: number;
  avgDurationMs: number;
  avgScrollDepth: number;
  avgLcpMs: number | null;
  avgTtfbMs: number | null;
  exits: number;
}

export interface BreakdownItem {
  key: string;
  label: string;
  sublabel?: string;
  count: number;
  uniqueIps: number;
  pct: number;
}

export interface WebVitalsSummary {
  sampleCount: number;
  ttfb: { p50: number | null; p75: number | null; p95: number | null };
  fcp: { p50: number | null; p75: number | null; p95: number | null };
  lcp: { p50: number | null; p75: number | null; p95: number | null };
  cls: { p50: number | null; p75: number | null; p95: number | null };
  loadTime: { p50: number | null; p75: number | null; p95: number | null };
}

export interface AdminDashboardSnapshot {
  generatedAt: number;
  viewerIp: string;
  filters: {
    range: TimeRangeKey;
    traffic: TrafficFilterKey;
    excludeOwner: boolean;
  };
  kpis: {
    activeNow: number;
    activeViewingResumeNow: number;
    activeUsingAssistantNow: number;
    totalVisits: number;
    uniqueIps: number;
    returningIps: number;
    totalPageViews: number;
    totalEvents: number;
    resumeViews: number;
    resumeModalOpens: number;
    resumeNewTabs: number;
    resumeDirectViews: number;
    resumeDownloads: number;
    resumeUniqueIps: number;
    resumeConversionPct: number;
    avgResumeReadMs: number;
    aiTotalQueries: number;
    aiGeminiPct: number;
    aiFailoverCount: number;
    aiAvgLatencyMs: number;
    aiTotalTokens: number;
    contactInquiriesTotal: number;
    contactUnreadCount: number;
    errorCount: number;
    notFoundCount: number;
    errorRatePct: number;
    botTrafficPct: number;
    healthScore: number;
    healthStatus: "operational" | "degraded" | "critical";
  };
  activeVisitors: Array<
    ActiveVisitorPresence & {
      totalVisitsFromIp: number;
      resumeDownloadsFromIp: number;
      resumeViewsFromIp: number;
      tag: IpTag;
      idleSeconds: number;
      sessionDurationSeconds: number;
      resumeDwellSeconds: number | null;
    }
  >;
  timeSeries: TimeSeriesPoint[];
  ipDirectory: IpProfile[];
  visitFrequencyBuckets: Array<{
    id: string;
    label: string;
    min: number;
    max: number | null;
    ipCount: number;
    totalVisits: number;
    pct: number;
  }>;
  resumeAnalytics: {
    funnel: Array<{
      stage: string;
      count: number;
      pctOfVisitors: number;
      detail: string;
    }>;
    downloadsBySource: BreakdownItem[];
    viewsBySource: BreakdownItem[];
    recentResumeEvents: TelemetryEvent[];
    topResumeIps: IpProfile[];
  };
  aiRouting: {
    geminiConfigured: boolean;
    keyFingerprint: string;
    envPrimaryModel: string;
    envFallbackModels: string[];
    envThinkingLevel: GeminiThinkingLevel;
    envMaxOutputTokens: number;
    effectivePrimaryModel: string;
    effectiveFallbackModels: string[];
    effectiveThinkingLevel: GeminiThinkingLevel;
    effectiveMaxOutputTokens: number;
    activeRoutedModel: string;
    activeRoutedModelLabel: string;
    activeRoutedMode: "gemini" | "grounded-index";
    lastRoutedAt: number | null;
    isCurrentlyFailedOver: boolean;
    override: AiRuntimeOverride | null;
    models: ModelRoutingStats[];
    recentLogs: AiRoutingLogEntry[];
  };
  pages: PagePerformanceRow[];
  referrers: BreakdownItem[];
  utmCampaigns: BreakdownItem[];
  countries: BreakdownItem[];
  cities: BreakdownItem[];
  browsers: BreakdownItem[];
  operatingSystems: BreakdownItem[];
  deviceTypes: BreakdownItem[];
  trafficClasses: BreakdownItem[];
  webVitals: WebVitalsSummary;
  recentLogs: TelemetryEvent[];
  errors: TelemetryEvent[];
  notFounds: Array<{
    path: string;
    count: number;
    uniqueIps: number;
    lastSeenAt: number;
    suspicious: boolean;
    sampleIp: string;
  }>;
  inquiries: ContactInquiryRecord[];
  auditLogs: AdminAuditEntry[];
  health: HealthCheckSnapshot;
  storage: StorageStatusInfo;
  authSecurity: {
    isProduction: boolean;
    passwordConfigured: boolean;
    secretConfigured: boolean;
    blockedIpCount: number;
    ownerIpCount: number;
    watchedIpCount: number;
  };
}
