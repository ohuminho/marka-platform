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

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Choose a document file." }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      console.error("[MARKA_KYC_UPLOAD] Supabase endpoint configuration is missing.");
      return NextResponse.json({ message: "Secure document upload is temporarily unavailable." }, { status: 503 });
    }

    const forwarded = new FormData();
    for (const key of ["subjectType", "documentType", "organizationId", "countryCode", "expiresAt"]) {
      const value = form.get(key);
      if (typeof value === "string" && value.trim()) forwarded.set(key, value.trim());
    }
    forwarded.set("file", file, file.name);

    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/functions/v1/marka-kyc-upload`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "x-marka-session": token,
        },
        body: forwarded,
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => ({ message: "Document upload failed." }));
    return NextResponse.json(data, { status: response.status, headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[MARKA_KYC_UPLOAD_ROUTE]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Unable to upload this document securely." }, { status: 500 });
  }
}
