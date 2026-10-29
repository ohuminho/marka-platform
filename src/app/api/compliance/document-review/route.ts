import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SessionService } from "@/core/auth/sessions/session.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get("marka_session")?.value;
    if (!token || !(await new SessionService().validate(token))) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }
    const body = await request.json().catch(() => null);
    if (!body || !["signed-url", "review-document"].includes(body.action) || typeof body.documentId !== "string") {
      return NextResponse.json({ message: "Invalid document review request." }, { status: 400 });
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ message: "Secure evidence review is temporarily unavailable." }, { status: 503 });
    }
    const form = new FormData();
    form.set("action", body.action);
    form.set("documentId", body.documentId);
    if (typeof body.status === "string") form.set("status", body.status);
    if (typeof body.reason === "string") form.set("reason", body.reason);
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/marka-kyc-upload`, {
      method: "POST",
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "x-marka-session": token },
      body: form,
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({ message: "Evidence review failed." }));
    return NextResponse.json(data, { status: response.status, headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[MARKA_COMPLIANCE_DOCUMENT_REVIEW]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Unable to complete document review." }, { status: 500 });
  }
}
