import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ message: "Method not allowed." }, 405);
  try {
    const token = request.headers.get("x-marka-session")?.trim();
    if (!token || token.length < 40 || token.length > 200) return json({ message: "Authentication required." }, 401);
    const tokenHash = await sha256(token);
    const { data: session, error: sessionError } = await supabase.from("Session")
      .select("id,userId,expiresAt,revokedAt").eq("tokenHash", tokenHash).maybeSingle();
    if (sessionError || !session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      return json({ message: "Session expired or invalid." }, 401);
    }
    const { data: user, error: userError } = await supabase.from("User")
      .select("id,status,role").eq("id", session.userId).maybeSingle();
    if (userError || !user || user.status !== "ACTIVE") return json({ message: "Active account required." }, 403);

    const form = await request.formData();
    const action = String(form.get("action") ?? "upload");

    if (action === "signed-url" || action === "review-document") {
      if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) return json({ message: "Administrative access required." }, 403);
      const documentId = String(form.get("documentId") ?? "").trim();
      if (!documentId) return json({ message: "Document reference required." }, 400);
      const { data: document, error: documentError } = await supabase.from("ComplianceDocument")
        .select("id,profileId,documentRef,expiresAt,status").eq("id", documentId).maybeSingle();
      if (documentError || !document || !document.documentRef) return json({ message: "Evidence not found." }, 404);
      const { data: profile, error: profileError } = await supabase.from("ComplianceProfile")
        .select("id,subjectType,subjectId,organizationId").eq("id", document.profileId).maybeSingle();
      if (profileError || !profile) return json({ message: "Compliance profile not found." }, 404);
      if (profile.subjectType === "KYC" && profile.subjectId === user.id) {
        return json({ message: "You cannot review your own identity evidence." }, 403);
      }
      const { data: signed, error: signedError } = await supabase.storage.from("marka-kyc-evidence")
        .createSignedUrl(document.documentRef, 300);
      if (signedError || !signed?.signedUrl) return json({ message: "Private evidence could not be opened." }, 404);
      if (action === "signed-url") return json({ signedUrl: signed.signedUrl, expiresIn: 300 });

      const status = String(form.get("status") ?? "");
      const reason = String(form.get("reason") ?? "").trim();
      if (!["VERIFIED", "REJECTED"].includes(status)) return json({ message: "Invalid document decision." }, 400);
      if (status === "REJECTED" && !reason) return json({ message: "A rejection reason is required." }, 400);
      if (status === "VERIFIED" && document.expiresAt && new Date(document.expiresAt).getTime() <= Date.now()) {
        return json({ message: "Expired evidence cannot be verified." }, 400);
      }
      const { data: updated, error: updateError } = await supabase.from("ComplianceDocument").update({
        status, reviewedAt: new Date().toISOString(), reviewedBy: user.id,
        rejectionReason: status === "REJECTED" ? reason : null,
      }).eq("id", document.id).select("id,documentType,status,expiresAt,rejectionReason").single();
      if (updateError || !updated) return json({ message: "Document review could not be saved." }, 500);
      return json({ document: updated });
    }

    const file = form.get("file");
    const subjectType = String(form.get("subjectType") ?? "");
    const documentType = String(form.get("documentType") ?? "").trim();
    const organizationId = String(form.get("organizationId") ?? "").trim() || null;
    const countryCode = String(form.get("countryCode") ?? "").trim().toUpperCase() || null;
    const expiresRaw = String(form.get("expiresAt") ?? "").trim();
    const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
    if (!(file instanceof File)) return json({ message: "Choose a document file." }, 400);
    if (!["KYC", "KYD", "KYB"].includes(subjectType)) return json({ message: "Invalid verification type." }, 400);
    if (documentType.length < 2 || documentType.length > 100) return json({ message: "Enter a valid document type." }, 400);
    if (file.size < 1 || file.size > 10 * 1024 * 1024) return json({ message: "File must be no larger than 10 MB." }, 413);
    // Mobile browsers and document providers may omit MIME metadata or use common aliases.
    // Detect the actual supported format from the file signature, then normalize the stored type.
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
      return json({ message: "Formato não reconhecido. Usa JPG/JPEG, PNG, WebP ou PDF, até 10 MB.", code: "UNSUPPORTED_FILE_SIGNATURE" }, 415);
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
      return json({ message: "The file content does not match its declared document type.", code: "FILE_TYPE_MISMATCH" }, 415);
    }
    const mimeToExt: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
    const extension = mimeToExt[detectedMime];
    if (expiresRaw && (!expiresAt || Number.isNaN(expiresAt.getTime()))) return json({ message: "Invalid expiry date." }, 400);
    if (expiresAt && expiresAt.getTime() <= Date.now()) return json({ message: "The document expiry date must be in the future." }, 400);

    let subjectId = user.id;
    let scopedOrganizationId: string | null = null;
    if (subjectType === "KYB") {
      if (!organizationId) return json({ message: "Select an organization for business verification." }, 400);
      const { data: membership } = await supabase.from("OrganizationMembership").select("id")
        .eq("userId", user.id).eq("organizationId", organizationId).eq("status", "ACTIVE").maybeSingle();
      if (!membership) return json({ message: "Active organization membership required." }, 403);
      subjectId = organizationId;
      scopedOrganizationId = organizationId;
    } else if (organizationId) return json({ message: "Personal verification cannot use an organization context." }, 400);

    let profileQuery = supabase.from("ComplianceProfile").select("id").eq("subjectType", subjectType).eq("subjectId", subjectId);
    profileQuery = scopedOrganizationId ? profileQuery.eq("organizationId", scopedOrganizationId) : profileQuery.is("organizationId", null);
    const { data: existing, error: profileLookupError } = await profileQuery.maybeSingle();
    if (profileLookupError) return json({ message: "Unable to load verification profile." }, 500);
    const profilePayload = {
      subjectType, subjectId, organizationId: scopedOrganizationId, countryCode,
      status: "PENDING", submittedAt: new Date().toISOString(), rejectionReason: null,
    };
    let profileId: string;
    if (existing) {
      const { error } = await supabase.from("ComplianceProfile").update(profilePayload).eq("id", existing.id);
      if (error) return json({ message: "Unable to update verification profile." }, 500);
      profileId = existing.id;
    } else {
      const { data, error } = await supabase.from("ComplianceProfile").insert(profilePayload).select("id").single();
      if (error || !data) return json({ message: "Unable to create verification profile." }, 500);
      profileId = data.id;
    }
    const path = user.id + "/" + profileId + "/" + crypto.randomUUID() + "." + extension;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from("marka-kyc-evidence").upload(path, bytes, {
      contentType: detectedMime, upsert: false, cacheControl: "0",
    });
    if (uploadError) return json({ message: "Secure document storage failed. Please retry." }, 500);
    const { data: document, error: documentError } = await supabase.from("ComplianceDocument").insert({
      profileId, documentType, documentRef: path, status: "PENDING", expiresAt: expiresAt?.toISOString() ?? null,
    }).select("id,documentType,status,expiresAt").single();
    if (documentError || !document) {
      await supabase.storage.from("marka-kyc-evidence").remove([path]);
      return json({ message: "Document record could not be saved." }, 500);
    }
    return json({ profileId, document, status: "PENDING" }, 201);
  } catch (error) {
    console.error("[MARKA_KYC_UPLOAD]", error instanceof Error ? error.message : "unknown error");
    return json({ message: "Unable to process this document securely." }, 500);
  }
});