import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin/auth";
import type { GeminiThinkingLevel } from "@/lib/gemini";
import { normalizeModelId } from "@/lib/gemini";
import {
  markInquiryReviewed,
  pruneTelemetryStore,
  recordAdminAudit,
  revokeAllAdminSessionsBefore,
  setAiRuntimeOverride,
  setIpAnnotation,
} from "@/lib/telemetry/store";
import type { AiRuntimeOverride, IpTag } from "@/lib/telemetry/types";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "X-Robots-Tag": "noindex, nofollow",
};

const VALID_TAGS = new Set<IpTag>([
  "none",
  "owner",
  "recruiter",
  "lead",
  "vip",
  "watched",
  "blocked",
  "bot",
]);

const VALID_THINKING = new Set<GeminiThinkingLevel>(["LOW", "MEDIUM", "HIGH"]);

interface AdminActionPayload {
  action?: string;
  ip?: string;
  tag?: IpTag;
  note?: string;
  blocked?: boolean;
  inquiryId?: string;
  reviewed?: boolean;
  override?: {
    enabled?: boolean;
    primaryModel?: string;
    fallbackModels?: string[];
    thinkingLevel?: GeminiThinkingLevel;
    maxOutputTokens?: number;
    forceGroundedIndex?: boolean;
  } | null;
  olderThanDays?: number;
  clearErrorsOnly?: boolean;
  resetAll?: boolean;
}

export async function POST(request: Request) {
  const auth = await requireAdminApiAuth(request);
  if (!auth.ok) return auth.response;

  const ua = (request.headers.get("user-agent") ?? "").slice(0, 220);

  try {
    const body = (await request.json()) as AdminActionPayload;
    const action = (body.action ?? "").trim();

    if (action === "annotate_ip") {
      const targetIp = (body.ip ?? "").trim().slice(0, 64);
      if (!targetIp) {
        return NextResponse.json(
          { error: "Missing target IP address." },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const tag =
        body.tag && VALID_TAGS.has(body.tag) ? body.tag : undefined;
      const updated = await setIpAnnotation({
        ip: targetIp,
        tag,
        note: typeof body.note === "string" ? body.note : undefined,
        blocked: typeof body.blocked === "boolean" ? body.blocked : undefined,
      });

      await recordAdminAudit({
        ip: auth.ip,
        action: updated.blocked ? "ip_blocked" : "ip_annotated",
        status: "success",
        details: `IP ${targetIp} -> tag=${updated.tag}, blocked=${updated.blocked}${updated.note ? `, note="${updated.note.slice(0, 80)}"` : ""}`,
        userAgent: ua,
      });

      return NextResponse.json(
        { ok: true, annotation: updated },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (action === "ignore_my_ip") {
      const updated = await setIpAnnotation({
        ip: auth.ip,
        tag: "owner",
        note: "Admin / Owner IP (auto-tagged)",
        blocked: false,
      });

      await recordAdminAudit({
        ip: auth.ip,
        action: "owner_ip_tagged",
        status: "success",
        details: `Tagged current admin IP ${auth.ip} as owner`,
        userAgent: ua,
      });

      return NextResponse.json(
        { ok: true, annotation: updated },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (action === "update_ai_override") {
      if (!body.override || !body.override.enabled) {
        await setAiRuntimeOverride(null);
        await recordAdminAudit({
          ip: auth.ip,
          action: "ai_override_cleared",
          status: "success",
          details: "Reset Gemini routing back to environment variable defaults",
          userAgent: ua,
        });
        return NextResponse.json(
          { ok: true, override: null },
          { headers: NO_STORE_HEADERS }
        );
      }

      const primaryModel = body.override.primaryModel
        ? normalizeModelId(body.override.primaryModel)
        : undefined;
      const fallbackModels = Array.isArray(body.override.fallbackModels)
        ? body.override.fallbackModels
            .map((m) => normalizeModelId(String(m)))
            .filter(Boolean)
            .slice(0, 6)
        : undefined;
      const thinkingLevel =
        body.override.thinkingLevel &&
        VALID_THINKING.has(body.override.thinkingLevel)
          ? body.override.thinkingLevel
          : undefined;
      const maxOutputTokens =
        typeof body.override.maxOutputTokens === "number" &&
        Number.isFinite(body.override.maxOutputTokens)
          ? Math.min(16384, Math.max(512, Math.round(body.override.maxOutputTokens)))
          : undefined;

      const nextOverride: AiRuntimeOverride = {
        enabled: true,
        primaryModel,
        fallbackModels,
        thinkingLevel,
        maxOutputTokens,
        forceGroundedIndex: Boolean(body.override.forceGroundedIndex),
        updatedAt: Date.now(),
        updatedBy: auth.session.sub,
      };

      const saved = await setAiRuntimeOverride(nextOverride);
      await recordAdminAudit({
        ip: auth.ip,
        action: "ai_override_updated",
        status: "success",
        details: nextOverride.forceGroundedIndex
          ? "Forced Grounded Dossier Index mode"
          : `Primary=${primaryModel ?? "env"}, Fallbacks=${fallbackModels ? (fallbackModels.length > 0 ? fallbackModels.join(",") : "none") : "env"}, Thinking=${thinkingLevel ?? "env"}, MaxTokens=${maxOutputTokens ?? "env"}`,
        userAgent: ua,
      });

      return NextResponse.json(
        { ok: true, override: saved },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (action === "mark_inquiry") {
      const id = (body.inquiryId ?? "").trim();
      if (!id) {
        return NextResponse.json(
          { error: "Missing inquiry ID." },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
      const ok = await markInquiryReviewed(id, Boolean(body.reviewed));
      await recordAdminAudit({
        ip: auth.ip,
        action: "inquiry_status_updated",
        status: ok ? "success" : "error",
        details: `Inquiry ${id} marked reviewed=${Boolean(body.reviewed)}`,
        userAgent: ua,
      });
      return NextResponse.json({ ok }, { headers: NO_STORE_HEADERS });
    }

    if (action === "prune_data") {
      const result = await pruneTelemetryStore({
        olderThanDays: body.olderThanDays,
        clearErrorsOnly: body.clearErrorsOnly,
        resetAll: body.resetAll,
      });

      await recordAdminAudit({
        ip: auth.ip,
        action: body.resetAll
          ? "telemetry_store_reset"
          : body.clearErrorsOnly
            ? "error_logs_cleared"
            : "telemetry_pruned",
        status: "success",
        details: `Removed ${result.removedEvents} events and ${result.removedAiLogs} AI logs`,
        userAgent: ua,
      });

      return NextResponse.json(
        { ok: true, ...result },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (action === "revoke_other_sessions") {
      // Revoke every session issued before the current session's iat
      await revokeAllAdminSessionsBefore(auth.session.iat);
      await recordAdminAudit({
        ip: auth.ip,
        action: "sessions_revoked",
        status: "success",
        details: `Revoked all sessions issued prior to ${new Date(auth.session.iat).toISOString()}`,
        userAgent: ua,
      });
      return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(
      { error: `Unknown admin action: "${action}"` },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid admin action payload." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
}
