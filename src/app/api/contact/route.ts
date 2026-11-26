import { NextResponse } from "next/server";
import { PROFILE } from "@/data/profile";
import { addStudioInquiry } from "@/lib/admin-store";

interface ContactRequestBody {
  name?: string;
  email?: string;
  track?: string;
  scope?: string;
  message?: string;
  companyWebsite?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactRequestBody;

    if (body.companyWebsite && body.companyWebsite.trim().length > 0) {
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
        {
          error:
            "Please share a brief project outline (at least 15 characters).",
        },
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
        addStudioInquiry({
          name,
          email,
          track,
          scope,
          message,
          deliveryMode: "resend",
        });

        return NextResponse.json({
          status: "sent",
          mode: "resend",
          message:
            "Your inquiry was delivered directly via Resend and logged to the Studio Console. Expect a response from UTC+1 within 24 hours.",
        });
      }

      addStudioInquiry({
        name,
        email,
        track,
        scope,
        message,
        deliveryMode: "fallback",
      });

      return NextResponse.json({
        status: "fallback",
        mode: "fallback",
        message:
          "Your brief is validated and logged. Launch your email client below or copy the formatted brief to send directly.",
        mailtoUrl,
        plainBrief,
      });
    }

    addStudioInquiry({
      name,
      email,
      track,
      scope,
      message,
      deliveryMode: "fallback",
    });

    return NextResponse.json({
      status: "fallback",
      mode: "fallback",
      message:
        "Brief validated and logged to the Studio Console. Direct SMTP relay (RESEND_API_KEY) is not active in this environment. Open your email client below or copy the formatted brief.",
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
