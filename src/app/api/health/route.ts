import { NextResponse } from "next/server";
import { inspectResumeAsset } from "@/lib/telemetry/health";
import { getStorageStatus } from "@/lib/telemetry/store";
import { isGeminiConfigured } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  const [resumeAsset, storage] = await Promise.all([
    inspectResumeAsset(),
    getStorageStatus(),
  ]);

  const healthy = resumeAsset.exists;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        resumeAsset: resumeAsset.exists ? "ok" : "missing",
        geminiConfigured: isGeminiConfigured(),
        storageDriver: storage.driver,
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
