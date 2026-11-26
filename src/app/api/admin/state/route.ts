import { NextResponse } from "next/server";
import { isAdminAuthenticated, isAdminPasscodeRequired } from "@/lib/admin-auth";
import {
  deleteStudioProject,
  getStudioState,
  resetStudioStateToDefaults,
  updateStudioProfile,
  upsertStudioProject,
  type StudioProfileSettings,
} from "@/lib/admin-store";
import { getGeminiConfig, isGeminiConfigured } from "@/lib/gemini";
import { buildGroundedSystemPrompt } from "@/lib/knowledge";
import { SITE_URL } from "@/lib/site";
import type { ProjectDossier } from "@/data/projects";

export const dynamic = "force-dynamic";

function buildDiagnostics() {
  const gemini = getGeminiConfig();
  const promptText = buildGroundedSystemPrompt();
  return {
    geminiEnabled: isGeminiConfigured(),
    primaryModel: gemini.primaryModel,
    fallbackModels: gemini.fallbackModels,
    thinkingLevel: gemini.thinkingLevel,
    maxOutputTokens: gemini.maxOutputTokens,
    resendConfigured: Boolean(
      process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0
    ),
    passcodeRequired: isAdminPasscodeRequired(),
    canonicalUrl: SITE_URL,
    systemPromptChars: promptText.length,
    systemPromptPreview: promptText,
  };
}

export async function GET() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json({
    state: getStudioState(),
    diagnostics: buildDiagnostics(),
  });
}

export async function PATCH(request: Request) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: "update-profile" | "upsert-project" | "delete-project" | "reset";
      profile?: Partial<StudioProfileSettings>;
      project?: Partial<ProjectDossier> & { slug: string };
      slug?: string;
    };

    if (body.action === "update-profile" && body.profile) {
      const next = updateStudioProfile(body.profile);
      return NextResponse.json({ state: next, diagnostics: buildDiagnostics() });
    }

    if (body.action === "upsert-project" && body.project?.slug) {
      const sanitizedSlug = body.project.slug
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, "");
      if (!sanitizedSlug) {
        return NextResponse.json(
          { error: "Provide a valid project slug." },
          { status: 400 }
        );
      }
      const next = upsertStudioProject({
        ...body.project,
        slug: sanitizedSlug,
      });
      return NextResponse.json({ state: next, diagnostics: buildDiagnostics() });
    }

    if (body.action === "delete-project" && body.slug) {
      const next = deleteStudioProject(body.slug);
      return NextResponse.json({ state: next, diagnostics: buildDiagnostics() });
    }

    if (body.action === "reset") {
      const next = resetStudioStateToDefaults();
      return NextResponse.json({ state: next, diagnostics: buildDiagnostics() });
    }

    return NextResponse.json(
      { error: "Unsupported studio action." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to apply studio update." },
      { status: 400 }
    );
  }
}
