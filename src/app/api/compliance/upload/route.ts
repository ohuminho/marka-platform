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
      return NextResponse.json({ message: "Escolhe uma fotografia ou ficheiro do documento." }, { status: 400 });
    }
    if (file.size < 1) {
      return NextResponse.json({ message: "O ficheiro selecionado está vazio." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: "O ficheiro excede o limite de 10 MB." }, { status: 413 });
    }

    // Mobile file pickers sometimes provide an empty or generic MIME type.
    // Identify supported files by their bytes and normalize the MIME type before forwarding.
    const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const startsWith = (bytes: number[]) => bytes.every((value, index) => signature[index] === value);
    const isJpeg = startsWith([0xff, 0xd8, 0xff]);
    const isPng = startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const isPdf = signature.length >= 5 && String.fromCharCode(...signature.slice(0, 5)) === "%PDF-";
    const isWebp = signature.length >= 12 &&
      String.fromCharCode(...signature.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
    const detectedMime = isJpeg ? "image/jpeg" : isPng ? "image/png" : isPdf ? "application/pdf" : isWebp ? "image/webp" : null;
    if (!detectedMime) {
      return NextResponse.json({
        message: "Formato não reconhecido. Usa uma fotografia JPG/JPEG, PNG, WebP ou um documento PDF, até 10 MB.",
        code: "UNSUPPORTED_FILE_SIGNATURE",
      }, { status: 415 });
    }
    const declaredMime = file.type.toLowerCase().split(";")[0].trim();
    const mimeAliases: Record<string, string> = {
      "image/jpg": "image/jpeg",
      "image/pjpeg": "image/jpeg",
      "application/x-pdf": "application/pdf",
    };
    const normalizedDeclaredMime = mimeAliases[declaredMime] ?? declaredMime;
    const genericMimes = ["", "application/octet-stream", "binary/octet-stream"];
    if (!genericMimes.includes(normalizedDeclaredMime) && normalizedDeclaredMime !== detectedMime) {
      return NextResponse.json({
        message: "O conteúdo do ficheiro não corresponde ao tipo declarado. Escolhe novamente o ficheiro original.",
        code: "FILE_TYPE_MISMATCH",
      }, { status: 415 });
    }
    const extensionByMime: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf",
    };
    const normalizedFile = new File([file], file.name || `document.${extensionByMime[detectedMime]}`, {
      type: detectedMime,
      lastModified: file.lastModified,
    });

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
    if (subjectType === "KYD" && driver && (
      ["IDENTITY_DOCUMENT", "DRIVING_LICENSE", "CRIMINAL_RECORD"].includes(documentType) ||
      documentType.startsWith("VEHICLE_")
    )) {
      const acceptedTerms = await prisma.auditLog.findFirst({
        where: {
          actorUserId: session.userId,
          organizationId: driver.organizationId,
          action: "MOBILITY_DRIVER_TERMS_ACCEPTED",
          entityType: "MobilityDriverTerms",
          entityId: "MARKA-MOBILITY-DRIVER-2026-10-29",
        },
        select: { id: true },
      });
      if (!acceptedTerms) return NextResponse.json({ message: "Aceita primeiro os Termos de Adesão do Motorista.", code: "DRIVER_TERMS_NOT_ACCEPTED" }, { status: 422 });
    }
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
    forwarded.set("file", normalizedFile, normalizedFile.name);

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
