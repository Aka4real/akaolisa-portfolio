import { NextResponse } from "next/server";
import { PROFILE } from "@/data/profile";
import { extractClientIp, parseUserAgent } from "@/lib/telemetry/ip";
import {
  isIpBlocked,
  recordContactInquiry,
  recordTelemetryEvent,
  resolveGeoWithCache,
} from "@/lib/telemetry/store";

interface ContactRequestBody {
  name?: string;
  email?: string;
  track?: string;
  scope?: string;
  message?: string;
  companyWebsite?: string; // honeypot
  visitorId?: string;
  sessionId?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const startedAt = Date.now();
  const ip = extractClientIp(request.headers);
  const ua = request.headers.get("user-agent") ?? "";

  if (await isIpBlocked(ip)) {
    return NextResponse.json(
      { error: "Unable to accept inquiries from this IP address." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as ContactRequestBody;
    const device = parseUserAgent(ua);
    const geo = await resolveGeoWithCache(ip, request.headers);
    const visitorId =
      typeof body.visitorId === "string" && body.visitorId.trim()
        ? body.visitorId.trim().slice(0, 64)
        : `srv_v_${ip.replace(/[^a-zA-Z0-9]/g, "")}`;
    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.trim()
        ? body.sessionId.trim().slice(0, 64)
        : `srv_s_${ip.replace(/[^a-zA-Z0-9]/g, "")}_${Math.floor(Date.now() / 1_800_000)}`;

    // Silent drop for honeypot spam + security telemetry log
    if (body.companyWebsite && body.companyWebsite.trim().length > 0) {
      await Promise.allSettled([
        recordContactInquiry({
          timestamp: Date.now(),
          ip,
          geo,
          name: (body.name ?? "Bot").slice(0, 120),
          email: (body.email ?? "").slice(0, 160),
          track: (body.track ?? "Unknown").slice(0, 80),
          scope: (body.scope ?? "Unknown").slice(0, 80),
          message: `[Honeypot triggered: "${body.companyWebsite.slice(0, 80)}"] ${(body.message ?? "").slice(0, 300)}`,
          status: "honeypot_blocked",
          deliveryMode: "blocked",
          reviewed: true,
        }),
        recordTelemetryEvent({
          timestamp: Date.now(),
          type: "security_event",
          severity: "warn",
          ip,
          visitorId,
          sessionId,
          path: "/api/contact",
          geo,
          device,
          statusCode: 200,
          latencyMs: Date.now() - startedAt,
          label: "Contact form honeypot spam silently dropped",
          source: "honeypot",
        }),
      ]);
      return NextResponse.json({ status: "sent", mode: "verified" });
    }

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const track = (body.track ?? "Full-Stack SaaS").trim();
    const scope = (body.scope ?? "Project Build").trim();
    const message = (body.message ?? "").trim();

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Please enter your name (at least 2 characters)." },
        { status: 400 }
      );
    }
    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (message.length < 15) {
      return NextResponse.json(
        { error: "Please share a brief project outline (at least 15 characters)." },
        { status: 400 }
      );
    }

    const subject = `[Portfolio Inquiry · ${track}] ${name}: ${scope}`;
    const plainBrief = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Track: ${track}`,
      `Scope: ${scope}`,
      ``,
      `Brief:`,
      message,
    ].join("\n");

    const mailtoUrl = `mailto:${PROFILE.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(plainBrief)}`;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && resendKey.trim().length > 0) {
      const fromEmail =
        process.env.CONTACT_FROM_EMAIL ||
        "Akaolisa Portfolio <onboarding@resend.dev>";
      const toEmail = process.env.CONTACT_TO_EMAIL || PROFILE.email;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          reply_to: email,
          subject,
          text: plainBrief,
        }),
      });

      if (resendResponse.ok) {
        await Promise.allSettled([
          recordContactInquiry({
            timestamp: Date.now(),
            ip,
            geo,
            name: name.slice(0, 120),
            email: email.slice(0, 160),
            track: track.slice(0, 80),
            scope: scope.slice(0, 80),
            message: message.slice(0, 2000),
            status: "sent",
            deliveryMode: "resend",
          }),
          recordTelemetryEvent({
            timestamp: Date.now(),
            type: "contact_submit",
            severity: "success",
            ip,
            visitorId,
            sessionId,
            path: "/contact",
            geo,
            device,
            statusCode: 200,
            latencyMs: Date.now() - startedAt,
            label: `Inquiry delivered via Resend from ${name} (${track})`,
            source: "resend",
            meta: { track, scope, emailDomain: email.split("@")[1] ?? "" },
          }),
        ]);

        return NextResponse.json({
          status: "sent",
          mode: "resend",
          message:
            "Your inquiry was delivered directly via Resend. Expect a response from UTC+1 within 24 hours.",
        });
      }

      await Promise.allSettled([
        recordContactInquiry({
          timestamp: Date.now(),
          ip,
          geo,
          name: name.slice(0, 120),
          email: email.slice(0, 160),
          track: track.slice(0, 80),
          scope: scope.slice(0, 80),
          message: message.slice(0, 2000),
          status: "fallback",
          deliveryMode: "fallback",
        }),
        recordTelemetryEvent({
          timestamp: Date.now(),
          type: "contact_submit",
          severity: "warn",
          ip,
          visitorId,
          sessionId,
          path: "/contact",
          geo,
          device,
          statusCode: resendResponse.status,
          latencyMs: Date.now() - startedAt,
          label: `Inquiry captured in fallback mode (Resend HTTP ${resendResponse.status})`,
          source: "resend_fallback",
          meta: { track, scope },
        }),
      ]);

      // If Resend rejects (e.g. unverified domain), gracefully fall back without losing the user's message.
      return NextResponse.json({
        status: "fallback",
        mode: "fallback",
        message:
          "Your brief is validated and ready. Launch your email client below or copy the formatted brief to send directly.",
        mailtoUrl,
        plainBrief,
      });
    }

    await Promise.allSettled([
      recordContactInquiry({
        timestamp: Date.now(),
        ip,
        geo,
        name: name.slice(0, 120),
        email: email.slice(0, 160),
        track: track.slice(0, 80),
        scope: scope.slice(0, 80),
        message: message.slice(0, 2000),
        status: "fallback",
        deliveryMode: "fallback",
      }),
      recordTelemetryEvent({
        timestamp: Date.now(),
        type: "contact_submit",
        severity: "success",
        ip,
        visitorId,
        sessionId,
        path: "/contact",
        geo,
        device,
        statusCode: 200,
        latencyMs: Date.now() - startedAt,
        label: `Inquiry captured in Admin Inbox from ${name} (${track})`,
        source: "fallback",
        meta: { track, scope },
      }),
    ]);

    return NextResponse.json({
      status: "fallback",
      mode: "fallback",
      message:
        "Brief validated and formatted. Direct SMTP relay (RESEND_API_KEY) is not active in this environment. Open your email client below or copy the formatted brief.",
      mailtoUrl,
      plainBrief,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to process inquiry payload. Please check your input." },
      { status: 400 }
    );
  }
}
