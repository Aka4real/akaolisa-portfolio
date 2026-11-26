import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  addStudioInquiry,
  deleteStudioInquiry,
  getStudioState,
  updateStudioInquiry,
  type InquiryStatus,
} from "@/lib/admin-store";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set<InquiryStatus>([
  "new",
  "reviewing",
  "replied",
  "archived",
]);

export async function POST(request: Request) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: "seed-sample";
      name?: string;
      email?: string;
      track?: string;
      scope?: string;
      message?: string;
    };

    if (body.action === "seed-sample") {
      addStudioInquiry({
        name: "Dr. Chidi Nwosu",
        email: "chidi.nwosu@meridianhealth.example",
        track: "Biomedical & HealthTech",
        scope: "HealthTech / LIS System",
        message:
          "Sample studio brief: Seeking a multi-site Laboratory Information System with automated IQC Westgard rule alerts and Supabase row-level isolation for 4 diagnostic labs.",
        deliveryMode: "sample",
      });

      return NextResponse.json({ state: getStudioState() });
    }

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const message = (body.message ?? "").trim();
    if (name.length < 2 || !email.includes("@") || message.length < 10) {
      return NextResponse.json(
        { error: "Provide valid name, email, and brief." },
        { status: 400 }
      );
    }

    addStudioInquiry({
      name,
      email,
      track: (body.track ?? "Full-Stack SaaS").trim(),
      scope: (body.scope ?? "Project Build").trim(),
      message,
      deliveryMode: "sample",
    });

    return NextResponse.json({ state: getStudioState() });
  } catch {
    return NextResponse.json(
      { error: "Unable to create inquiry record." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      status?: InquiryStatus;
      notes?: string;
    };

    if (!body.id) {
      return NextResponse.json(
        { error: "Inquiry ID is required." },
        { status: 400 }
      );
    }

    const patch: Partial<{ status: InquiryStatus; notes: string }> = {};
    if (body.status && VALID_STATUSES.has(body.status)) {
      patch.status = body.status;
    }
    if (typeof body.notes === "string") {
      patch.notes = body.notes.slice(0, 2000);
    }

    const state = updateStudioInquiry(body.id, patch);
    return NextResponse.json({ state });
  } catch {
    return NextResponse.json(
      { error: "Unable to update inquiry." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Inquiry ID is required." },
        { status: 400 }
      );
    }
    const state = deleteStudioInquiry(id);
    return NextResponse.json({ state });
  } catch {
    return NextResponse.json(
      { error: "Unable to remove inquiry." },
      { status: 400 }
    );
  }
}
