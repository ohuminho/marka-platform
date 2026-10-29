import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get("marka_session")?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!token || !session) {
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

    const subjectType = String(form.get("subjectType") ?? "").trim();
    const documentType = String(form.get("documentType") ?? "").trim();
    const expiresRaw = String(form.get("expiresAt") ?? "").trim();
    const driver = subjectType === "KYD"
      ? await prisma.mobilityDriver.findUnique({ where: { userId: session.userId }, select: { id: true, organizationId: true } })
      : null;
    let primaryVehicleId: string | null = null;
    if (subjectType === "KYD" && documentType.startsWith("VEHICLE_")) {
      if (!driver) return NextResponse.json({ message: "Inicia primeiro a candidatura de motorista.", code: "DRIVER_APPLICATION_REQUIRED" }, { status: 409 });
      const primary = await prisma.mobilityDriverVehicle.findFirst({
        where: { driverId: driver.id, activeUntil: null, isPrimary: true },
        select: { vehicleId: true },
      });
      if (!primary) return NextResponse.json({ message: "Regista primeiro o veículo antes de carregar os documentos da viatura.", code: "VEHICLE_REGISTRATION_REQUIRED" }, { status: 409 });
      primaryVehicleId = primary.vehicleId;
      const requiredVehicleDocument = await prisma.mobilityVehicleVerification.findFirst({
        where: { vehicleId: primaryVehicleId, documentType },
        select: { id: true },
      });
      if (!requiredVehicleDocument) return NextResponse.json({ message: "Tipo de documento do veículo não reconhecido.", code: "UNKNOWN_VEHICLE_DOCUMENT_TYPE" }, { status: 400 });
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
    if (response.ok && subjectType === "KYD" && data?.document?.id) {
      const expiry = expiresRaw ? new Date(expiresRaw) : null;
      const metadata = {
        documentSubmitted: true,
        complianceDocumentId: String(data.document.id),
        submittedAt: new Date().toISOString(),
        storage: "private-compliance-evidence",
      };
      if (documentType.startsWith("VEHICLE_") && primaryVehicleId) {
        await prisma.mobilityVehicleVerification.updateMany({
          where: { vehicleId: primaryVehicleId, documentType },
          data: {
            documentRef: String(data.document.id),
            documentExpiry: expiry && !Number.isNaN(expiry.getTime()) ? expiry : null,
            status: "PENDING",
            reviewedAt: null,
            reviewedBy: null,
            rejectionReason: null,
            metadata,
          },
        });
      } else if (driver) {
        await prisma.mobilityDriverVerification.updateMany({
          where: { driverId: driver.id, documentType },
          data: {
            documentRef: String(data.document.id),
            documentExpiry: expiry && !Number.isNaN(expiry.getTime()) ? expiry : null,
            status: "PENDING",
            reviewedAt: null,
            reviewedBy: null,
            rejectionReason: null,
            metadata,
          },
        });
      }
    }
    return NextResponse.json(data, { status: response.status, headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[MARKA_KYC_UPLOAD_ROUTE]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Unable to upload this document securely." }, { status: 500 });
  }
}
