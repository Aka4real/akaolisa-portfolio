import type { ChatHistoryTurn } from "./knowledge";
import type {
  AiRuntimeOverride,
  GeminiAttemptTrace,
  GeminiModelProbeResult,
} from "./telemetry/types";

export type GeminiThinkingLevel = "LOW" | "MEDIUM" | "HIGH";

export interface GeminiConfig {
  apiKey: string;
  primaryModel: string;
  fallbackModels: string[];
  thinkingLevel: GeminiThinkingLevel;
  maxOutputTokens: number;
  forceGroundedIndex?: boolean;
  overrideActive?: boolean;
}

export interface GeminiGenerationResult {
  text: string;
  model: string;
  finishReason?: string;
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
}

export interface GeminiRoutedGenerationResult {
  result: GeminiGenerationResult | null;
  configuredPrimary: string;
  modelChain: string[];
  attempts: GeminiAttemptTrace[];
  wasFailover: boolean;
  failoverDepth: number;
  totalLatencyMs: number;
  overrideActive: boolean;
  forcedGroundedIndex: boolean;
  errorSummary?: string;
}

interface GeminiContentPart {
  text?: string;
  thought?: boolean;
}

interface GeminiContentMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiContentPart[];
    };
    finishReason?: string;
  }>;
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface GeminiModelMetadataResponse {
  name?: string;
  displayName?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
export const DEFAULT_GEMINI_FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
] as const;
export const DEFAULT_GEMINI_THINKING_LEVEL: GeminiThinkingLevel = "LOW";
export const DEFAULT_GEMINI_MAX_OUTPUT_TOKENS = 4096;

export const MAX_QUERY_CHARS = 4000;
export const MAX_HISTORY_TURNS = 20;
export const MAX_HISTORY_CHARS = 24000;

const TOTAL_UPSTREAM_BUDGET_MS = 26000;
const PRIMARY_ATTEMPT_TIMEOUT_MS = 10000;
const FALLBACK_ATTEMPT_TIMEOUT_MS = 9000;
const FINAL_FALLBACK_RESERVE_MS = 5000;
const MIN_ATTEMPT_TIMEOUT_MS = 3000;

const VALID_THINKING_LEVELS = new Set<GeminiThinkingLevel>([
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export function normalizeModelId(raw: string): string {
  return raw.trim().replace(/^models\//i, "");
}

function parseThinkingLevel(raw: string | undefined): GeminiThinkingLevel {
  const upper = (raw ?? "").trim().toUpperCase() as GeminiThinkingLevel;
  return VALID_THINKING_LEVELS.has(upper)
    ? upper
    : DEFAULT_GEMINI_THINKING_LEVEL;
}

function parseMaxOutputTokens(raw: string | undefined): number {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_GEMINI_MAX_OUTPUT_TOKENS;
  return Math.min(16384, Math.max(512, parsed));
}

function parseFallbackModels(
  raw: string | undefined,
  primaryModel: string
): string[] {
  const list =
    raw !== undefined
      ? raw
          .split(",")
          .map(normalizeModelId)
          .filter((m) => m.length > 0)
      : [...DEFAULT_GEMINI_FALLBACK_MODELS];

  const deduped: string[] = [];
  const seen = new Set<string>([primaryModel]);
  for (const m of list) {
    if (!seen.has(m)) {
      seen.add(m);
      deduped.push(m);
    }
  }
  return deduped;
}

export function getGeminiConfig(): GeminiConfig {
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  const primaryModel =
    normalizeModelId(process.env.GEMINI_MODEL ?? "") || DEFAULT_GEMINI_MODEL;
  const fallbackModels = parseFallbackModels(
    process.env.GEMINI_FALLBACK_MODELS,
    primaryModel
  );
  const thinkingLevel = parseThinkingLevel(process.env.GEMINI_THINKING_LEVEL);
  const maxOutputTokens = parseMaxOutputTokens(
    process.env.GEMINI_MAX_OUTPUT_TOKENS
  );

  return {
    apiKey,
    primaryModel,
    fallbackModels,
    thinkingLevel,
    maxOutputTokens,
    forceGroundedIndex: false,
    overrideActive: false,
  };
}

export function applyGeminiOverride(
  base: GeminiConfig,
  override?: AiRuntimeOverride | null
): GeminiConfig {
  if (!override || !override.enabled) {
    return base;
  }

  const primaryModel = override.primaryModel
    ? normalizeModelId(override.primaryModel) || base.primaryModel
    : base.primaryModel;

  const rawFallbacks =
    Array.isArray(override.fallbackModels) && override.fallbackModels.length > 0
      ? override.fallbackModels.map(normalizeModelId).filter(Boolean)
      : base.fallbackModels;

  const seen = new Set<string>([primaryModel]);
  const fallbackModels: string[] = [];
  for (const m of rawFallbacks) {
    if (!seen.has(m)) {
      seen.add(m);
      fallbackModels.push(m);
    }
  }

  const thinkingLevel = override.thinkingLevel
    ? parseThinkingLevel(override.thinkingLevel)
    : base.thinkingLevel;

  const maxOutputTokens =
    typeof override.maxOutputTokens === "number" &&
    Number.isFinite(override.maxOutputTokens)
      ? Math.min(16384, Math.max(512, Math.round(override.maxOutputTokens)))
      : base.maxOutputTokens;

  return {
    apiKey: base.apiKey,
    primaryModel,
    fallbackModels,
    thinkingLevel,
    maxOutputTokens,
    forceGroundedIndex: Boolean(override.forceGroundedIndex),
    overrideActive: true,
  };
}

export function isGeminiConfigured(): boolean {
  return getGeminiConfig().apiKey.length > 0;
}

export function getGeminiKeyFingerprint(): string {
  const key = getGeminiConfig().apiKey;
  if (!key) return "Not Configured";
  if (key.length <= 10) return "Configured (masked)";
  return `${key.slice(0, 5)}••••${key.slice(-4)}`;
}

/**
 * Gemini 3.x non-lite Flash models (including gemini-3.8-flash) support string
 * thinkingLevel ("LOW" | "MEDIUM" | "HIGH") and ignore custom temperature/topP.
 * Lite variants default to fast non-thinking generation for minimal latency.
 */
function supportsThinkingLevelConfig(model: string): boolean {
  const id = model.toLowerCase();
  if (id.includes("lite") || id.includes("tts") || id.includes("image")) {
    return false;
  }
  return id.startsWith("gemini-3") || id.startsWith("gemini-4");
}

function buildConversationContents(
  history: ChatHistoryTurn[] | undefined,
  currentQuery: string
): GeminiContentMessage[] {
  const sanitizedHistory: GeminiContentMessage[] = [];
  let charBudgetRemaining = MAX_HISTORY_CHARS;

  const recentTurns = (history ?? []).slice(-MAX_HISTORY_TURNS);
  for (let i = recentTurns.length - 1; i >= 0; i--) {
    const turn = recentTurns[i];
    if (!turn || (turn.role !== "user" && turn.role !== "assistant")) continue;
    const text = (turn.content ?? "").trim().slice(0, MAX_QUERY_CHARS);
    if (!text) continue;
    if (text.length > charBudgetRemaining && sanitizedHistory.length > 0) break;

    charBudgetRemaining -= text.length;
    sanitizedHistory.unshift({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }

  // Gemini multi-turn contents must begin with a user turn.
  while (
    sanitizedHistory.length > 0 &&
    sanitizedHistory[0]?.role !== "user"
  ) {
    sanitizedHistory.shift();
  }

  // Merge consecutive identical roles so history stays strictly alternating.
  const normalized: GeminiContentMessage[] = [];
  for (const msg of sanitizedHistory) {
    const prev = normalized[normalized.length - 1];
    if (prev && prev.role === msg.role) {
      prev.parts[0].text = `${prev.parts[0].text}\n\n${msg.parts[0].text}`;
    } else {
      normalized.push(msg);
    }
  }

  const trimmedQuery = currentQuery.trim().slice(0, MAX_QUERY_CHARS);
  const last = normalized[normalized.length - 1];
  if (last && last.role === "user") {
    if (last.parts[0].text !== trimmedQuery) {
      last.parts[0].text = `${last.parts[0].text}\n\n${trimmedQuery}`;
    }
  } else {
    normalized.push({
      role: "user",
      parts: [{ text: trimmedQuery }],
    });
  }

  return normalized;
}

function extractVisibleText(data: GeminiApiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

export async function generateGeminiAnswerWithTrace(params: {
  systemPrompt: string;
  query: string;
  history?: ChatHistoryTurn[];
  override?: AiRuntimeOverride | null;
}): Promise<GeminiRoutedGenerationResult> {
  const config = applyGeminiOverride(getGeminiConfig(), params.override);
  const modelChain = [config.primaryModel, ...config.fallbackModels];
  const startedAt = Date.now();
  const attempts: GeminiAttemptTrace[] = [];

  if (config.forceGroundedIndex) {
    return {
      result: null,
      configuredPrimary: config.primaryModel,
      modelChain,
      attempts,
      wasFailover: false,
      failoverDepth: 0,
      totalLatencyMs: Date.now() - startedAt,
      overrideActive: Boolean(config.overrideActive),
      forcedGroundedIndex: true,
      errorSummary: "Admin runtime override forces Grounded Dossier Index",
    };
  }

  if (!config.apiKey) {
    return {
      result: null,
      configuredPrimary: config.primaryModel,
      modelChain,
      attempts,
      wasFailover: false,
      failoverDepth: 0,
      totalLatencyMs: Date.now() - startedAt,
      overrideActive: Boolean(config.overrideActive),
      forcedGroundedIndex: false,
      errorSummary: "GEMINI_API_KEY not configured",
    };
  }

  const contents = buildConversationContents(params.history, params.query);
  let lastErrorSummary = "";

  for (let i = 0; i < modelChain.length; i++) {
    const model = modelChain[i];
    const elapsed = Date.now() - startedAt;
    const remainingBudget = TOTAL_UPSTREAM_BUDGET_MS - elapsed;
    const attemptStart = Date.now();

    if (remainingBudget < MIN_ATTEMPT_TIMEOUT_MS) {
      attempts.push({
        model,
        status: "skipped",
        errorMessage: "Upstream time budget exhausted",
        latencyMs: 0,
        thinkingConfigApplied: false,
        startedAt: attemptStart,
      });
      break;
    }

    const isLastModel = i === modelChain.length - 1;
    const reserveForLater = isLastModel ? 0 : FINAL_FALLBACK_RESERVE_MS;
    const maxAllowedThisAttempt = Math.max(
      MIN_ATTEMPT_TIMEOUT_MS,
      remainingBudget - reserveForLater
    );
    const attemptTimeoutMs = Math.min(
      i === 0 ? PRIMARY_ATTEMPT_TIMEOUT_MS : FALLBACK_ATTEMPT_TIMEOUT_MS,
      maxAllowedThisAttempt
    );

    const thinkingConfigApplied = supportsThinkingLevelConfig(model);
    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: config.maxOutputTokens,
    };

    if (thinkingConfigApplied) {
      generationConfig.thinkingConfig = {
        thinkingLevel: config.thinkingLevel,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);

    try {
      const endpoint = `${GEMINI_API_BASE}/${encodeURIComponent(
        model
      )}:generateContent`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": config.apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: params.systemPrompt }],
          },
          contents,
          generationConfig,
        }),
      });

      clearTimeout(timeout);
      const attemptLatency = Date.now() - attemptStart;

      if (!res.ok) {
        let errorStatus = "";
        let errorMessage = "";
        try {
          const errJson = (await res.json()) as GeminiApiResponse;
          errorStatus = errJson.error?.status ?? "";
          errorMessage = errJson.error?.message ?? "";
        } catch {
          // Ignore unreadable error bodies
        }

        const isAuthErr = res.status === 401 || res.status === 403;
        lastErrorSummary = `${model} (${res.status} ${errorStatus}): ${errorMessage.slice(0, 120)}`;

        attempts.push({
          model,
          status: isAuthErr ? "auth_error" : "http_error",
          httpStatus: res.status,
          errorStatus: errorStatus || undefined,
          errorMessage: errorMessage.slice(0, 200) || `HTTP ${res.status}`,
          latencyMs: attemptLatency,
          thinkingConfigApplied,
          startedAt: attemptStart,
        });

        console.warn(
          `[gemini] ${model} failed (${res.status} ${errorStatus}): ${errorMessage.slice(
            0,
            140
          )}`
        );

        // Auth/permission failures apply to every model under the same key.
        if (isAuthErr) {
          return {
            result: null,
            configuredPrimary: config.primaryModel,
            modelChain,
            attempts,
            wasFailover: true,
            failoverDepth: i + 1,
            totalLatencyMs: Date.now() - startedAt,
            overrideActive: Boolean(config.overrideActive),
            forcedGroundedIndex: false,
            errorSummary: lastErrorSummary,
          };
        }
        continue;
      }

      const data = (await res.json()) as GeminiApiResponse;
      const text = extractVisibleText(data);
      if (text.length > 0) {
        const resolvedModel = normalizeModelId(data.modelVersion || model);
        attempts.push({
          model,
          status: "success",
          httpStatus: res.status,
          latencyMs: attemptLatency,
          thinkingConfigApplied,
          startedAt: attemptStart,
        });

        return {
          result: {
            text,
            model: resolvedModel,
            finishReason: data.candidates?.[0]?.finishReason,
            usage: data.usageMetadata,
          },
          configuredPrimary: config.primaryModel,
          modelChain,
          attempts,
          wasFailover: i > 0,
          failoverDepth: i,
          totalLatencyMs: Date.now() - startedAt,
          overrideActive: Boolean(config.overrideActive),
          forcedGroundedIndex: false,
        };
      }

      const emptyReason = `Empty visible text (finishReason=${
        data.candidates?.[0]?.finishReason ?? "unknown"
      })`;
      lastErrorSummary = `${model}: ${emptyReason}`;
      attempts.push({
        model,
        status: "empty",
        httpStatus: res.status,
        errorMessage: emptyReason,
        latencyMs: attemptLatency,
        thinkingConfigApplied,
        startedAt: attemptStart,
      });

      console.warn(`[gemini] ${model} returned ${emptyReason}`);
    } catch (err) {
      clearTimeout(timeout);
      const attemptLatency = Date.now() - attemptStart;
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" || err.message.toLowerCase().includes("abort"));
      const reason =
        err instanceof Error ? err.message : "unknown network error";
      lastErrorSummary = `${model}: ${isAbort ? `timeout (${attemptTimeoutMs}ms)` : reason}`;

      attempts.push({
        model,
        status: isAbort ? "timeout" : "network_error",
        errorMessage: isAbort
          ? `Request timed out after ${attemptTimeoutMs}ms`
          : reason.slice(0, 200),
        latencyMs: attemptLatency,
        thinkingConfigApplied,
        startedAt: attemptStart,
      });

      console.warn(`[gemini] ${model} request error: ${reason}`);
    }
  }

  return {
    result: null,
    configuredPrimary: config.primaryModel,
    modelChain,
    attempts,
    wasFailover: true,
    failoverDepth: attempts.length,
    totalLatencyMs: Date.now() - startedAt,
    overrideActive: Boolean(config.overrideActive),
    forcedGroundedIndex: false,
    errorSummary: lastErrorSummary || "All Gemini models failed",
  };
}

export async function generateGeminiAnswer(params: {
  systemPrompt: string;
  query: string;
  history?: ChatHistoryTurn[];
  override?: AiRuntimeOverride | null;
}): Promise<GeminiGenerationResult | null> {
  const traced = await generateGeminiAnswerWithTrace(params);
  return traced.result;
}

/**
 * Probes every model in the effective Gemini chain via Google's model metadata endpoint
 * to verify live reachability, key validity, latency, and token limits without wasting tokens.
 */
export async function probeGeminiModelChain(
  override?: AiRuntimeOverride | null
): Promise<GeminiModelProbeResult[]> {
  const config = applyGeminiOverride(getGeminiConfig(), override);
  const chain = [config.primaryModel, ...config.fallbackModels];

  if (!config.apiKey) {
    return chain.map((model, idx) => ({
      model,
      role: idx === 0 ? "primary" : "fallback",
      status: "unconfigured",
      latencyMs: 0,
      error: "GEMINI_API_KEY not configured",
    }));
  }

  return Promise.all(
    chain.map(async (model, idx): Promise<GeminiModelProbeResult> => {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(
          `${GEMINI_API_BASE}/${encodeURIComponent(model)}`,
          {
            method: "GET",
            headers: {
              "x-goog-api-key": config.apiKey,
            },
            signal: controller.signal,
            cache: "no-store",
          }
        );
        clearTimeout(timeout);
        const latencyMs = Date.now() - start;

        if (!res.ok) {
          let errMsg = `HTTP ${res.status}`;
          try {
            const errBody = (await res.json()) as GeminiModelMetadataResponse;
            if (errBody.error?.message) {
              errMsg = `${res.status} ${errBody.error.status ?? ""}: ${errBody.error.message.slice(0, 120)}`;
            }
          } catch {
            // ignore
          }
          return {
            model,
            role: idx === 0 ? "primary" : "fallback",
            status: res.status === 429 ? "degraded" : "error",
            httpStatus: res.status,
            latencyMs,
            error: errMsg,
          };
        }

        const meta = (await res.json()) as GeminiModelMetadataResponse;
        return {
          model,
          role: idx === 0 ? "primary" : "fallback",
          status: latencyMs > 2500 ? "degraded" : "reachable",
          httpStatus: res.status,
          latencyMs,
          displayName: meta.displayName,
          inputTokenLimit: meta.inputTokenLimit,
          outputTokenLimit: meta.outputTokenLimit,
        };
      } catch (err) {
        clearTimeout(timeout);
        return {
          model,
          role: idx === 0 ? "primary" : "fallback",
          status: "error",
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    })
  );
}
