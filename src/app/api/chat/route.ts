import { NextResponse } from "next/server";
import {
  answerFromGroundedIndex,
  buildGroundedSystemPrompt,
  suggestLinksForConversation,
  type ChatHistoryTurn,
  type ChatResponsePayload,
} from "@/lib/knowledge";
import {
  applyGeminiOverride,
  generateGeminiAnswerWithTrace,
  getGeminiConfig,
  isGeminiConfigured,
  MAX_HISTORY_TURNS,
  MAX_QUERY_CHARS,
} from "@/lib/gemini";
import { extractClientIp, parseUserAgent } from "@/lib/telemetry/ip";
import {
  getAiRuntimeOverride,
  getTelemetryStore,
  isIpBlocked,
  recordAiRoutingLog,
  recordTelemetryEvent,
  resolveGeoWithCache,
} from "@/lib/telemetry/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ChatRequestBody {
  query?: string;
  history?: unknown;
  visitorId?: string;
  sessionId?: string;
}

function sanitizeHistory(raw: unknown): ChatHistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatHistoryTurn[] = [];
  for (const item of raw.slice(-MAX_HISTORY_TURNS)) {
    if (!item || typeof item !== "object") continue;
    const record = item as { role?: unknown; content?: unknown };
    if (record.role !== "user" && record.role !== "assistant") continue;
    if (typeof record.content !== "string") continue;
    const content = record.content.trim().slice(0, MAX_QUERY_CHARS);
    if (!content) continue;
    turns.push({ role: record.role, content });
  }
  return turns;
}

export async function GET() {
  const [override, store] = await Promise.all([
    getAiRuntimeOverride(),
    getTelemetryStore(),
  ]);
  const baseConfig = getGeminiConfig();
  const effective = applyGeminiOverride(baseConfig, override);
  const latestLog = store.aiLogs[store.aiLogs.length - 1] ?? null;

  const geminiEnabled =
    isGeminiConfigured() && !effective.forceGroundedIndex;

  const overrideUpdatedAt = override?.enabled ? override.updatedAt : 0;
  const latestLogMatchesPolicy = Boolean(
    latestLog &&
      latestLog.timestamp >= overrideUpdatedAt &&
      latestLog.configuredPrimary === effective.primaryModel
  );

  return NextResponse.json(
    {
      geminiEnabled,
      primaryModel: effective.primaryModel,
      fallbackModels: effective.fallbackModels,
      thinkingLevel: effective.thinkingLevel,
      activeRoutedModel: effective.forceGroundedIndex
        ? "grounded-index"
        : latestLogMatchesPolicy && latestLog
          ? latestLog.resolvedModel
          : geminiEnabled
            ? effective.primaryModel
            : "grounded-index",
      maxOutputTokens: effective.maxOutputTokens,
      overrideActive: Boolean(effective.overrideActive),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const ip = extractClientIp(request.headers);
  const ua = request.headers.get("user-agent") ?? "";
  const isProbe = request.headers.get("x-internal-probe") === "1";

  if (!isProbe && (await isIpBlocked(ip))) {
    return NextResponse.json(
      { error: "Access restricted for this IP address." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as ChatRequestBody;
    const query = (body.query ?? "").trim().slice(0, MAX_QUERY_CHARS);

    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          error:
            "Please enter a question about Akaolisa's background, stack, or projects.",
        },
        { status: 400 }
      );
    }

    const history = sanitizeHistory(body.history);
    const override = await getAiRuntimeOverride();
    const effective = applyGeminiOverride(getGeminiConfig(), override);
    const visitorId =
      typeof body.visitorId === "string" && body.visitorId.trim()
        ? body.visitorId.trim().slice(0, 64)
        : `srv_v_${ip.replace(/[^a-zA-Z0-9]/g, "")}`;
    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.trim()
        ? body.sessionId.trim().slice(0, 64)
        : `srv_s_${ip.replace(/[^a-zA-Z0-9]/g, "")}_${Math.floor(Date.now() / 1_800_000)}`;

    const device = parseUserAgent(ua);
    const geo = await resolveGeoWithCache(ip, request.headers);

    if (isGeminiConfigured() && !effective.forceGroundedIndex) {
      const traced = await generateGeminiAnswerWithTrace({
        systemPrompt: buildGroundedSystemPrompt(),
        query,
        history,
        override,
      });

      if (traced.result) {
        const payload: ChatResponsePayload = {
          answer: traced.result.text,
          mode: "gemini",
          model: traced.result.model,
          links: suggestLinksForConversation(query, traced.result.text),
        };

        if (!isProbe) {
          await Promise.allSettled([
            recordAiRoutingLog({
              timestamp: Date.now(),
              ip,
              visitorId,
              sessionId,
              geo,
              query: query.slice(0, 400),
              answerPreview: traced.result.text.slice(0, 280),
              mode: "gemini",
              configuredPrimary: traced.configuredPrimary,
              resolvedModel: traced.result.model,
              wasFailover: traced.wasFailover,
              failoverDepth: traced.failoverDepth,
              overrideActive: traced.overrideActive,
              attempts: traced.attempts,
              latencyMs: traced.totalLatencyMs,
              usage: traced.result.usage,
              finishReason: traced.result.finishReason,
            }),
            recordTelemetryEvent({
              timestamp: Date.now(),
              type: "ai_chat",
              severity: traced.wasFailover ? "warn" : "success",
              ip,
              visitorId,
              sessionId,
              path: "/api/chat",
              geo,
              device,
              statusCode: 200,
              latencyMs: traced.totalLatencyMs,
              label: `AI query routed to ${traced.result.model}${traced.wasFailover ? " (failover)" : ""}`,
              source: traced.result.model,
              meta: {
                mode: "gemini",
                model: traced.result.model,
                configuredPrimary: traced.configuredPrimary,
                wasFailover: traced.wasFailover,
                totalTokens: traced.result.usage?.totalTokenCount ?? 0,
                queryPreview: query.slice(0, 140),
              },
            }),
          ]);
        }

        return NextResponse.json(payload);
      }

      // Gemini configured but all models failed -> log failover to grounded-index
      const groundedFallback = answerFromGroundedIndex(query);
      const totalLatencyMs = Date.now() - startedAt;

      if (!isProbe) {
        await Promise.allSettled([
          recordAiRoutingLog({
            timestamp: Date.now(),
            ip,
            visitorId,
            sessionId,
            geo,
            query: query.slice(0, 400),
            answerPreview: groundedFallback.answer.slice(0, 280),
            mode: "grounded-index",
            configuredPrimary: traced.configuredPrimary,
            resolvedModel: "grounded-index",
            wasFailover: true,
            failoverDepth: traced.attempts.length,
            overrideActive: traced.overrideActive,
            attempts: traced.attempts,
            latencyMs: totalLatencyMs,
            errorSummary: traced.errorSummary,
          }),
          recordTelemetryEvent({
            timestamp: Date.now(),
            type: "ai_chat",
            severity: "warn",
            ip,
            visitorId,
            sessionId,
            path: "/api/chat",
            geo,
            device,
            statusCode: 200,
            latencyMs: totalLatencyMs,
            label: "AI query failed over to Grounded Dossier Index",
            source: "grounded-index",
            meta: {
              mode: "grounded-index",
              configuredPrimary: traced.configuredPrimary,
              wasFailover: true,
              errorSummary: traced.errorSummary,
              queryPreview: query.slice(0, 140),
            },
          }),
        ]);
      }

      return NextResponse.json(groundedFallback);
    }

    const groundedFallback = answerFromGroundedIndex(query);
    const totalLatencyMs = Date.now() - startedAt;

    if (!isProbe) {
      await Promise.allSettled([
        recordAiRoutingLog({
          timestamp: Date.now(),
          ip,
          visitorId,
          sessionId,
          geo,
          query: query.slice(0, 400),
          answerPreview: groundedFallback.answer.slice(0, 280),
          mode: "grounded-index",
          configuredPrimary: effective.primaryModel,
          resolvedModel: "grounded-index",
          wasFailover: false,
          failoverDepth: 0,
          overrideActive: Boolean(effective.overrideActive),
          attempts: [],
          latencyMs: totalLatencyMs,
          errorSummary: effective.forceGroundedIndex
            ? "Admin override forces Grounded Dossier Index"
            : "GEMINI_API_KEY not configured",
        }),
        recordTelemetryEvent({
          timestamp: Date.now(),
          type: "ai_chat",
          severity: "info",
          ip,
          visitorId,
          sessionId,
          path: "/api/chat",
          geo,
          device,
          statusCode: 200,
          latencyMs: totalLatencyMs,
          label: "AI query served by Grounded Dossier Index",
          source: "grounded-index",
          meta: {
            mode: "grounded-index",
            queryPreview: query.slice(0, 140),
          },
        }),
      ]);
    }

    return NextResponse.json(groundedFallback);
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}
