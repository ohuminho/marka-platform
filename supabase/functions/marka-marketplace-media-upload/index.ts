import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ message: "Method not allowed." }, 405);
  try {
    const token = request.headers.get("x-marka-session")?.trim();
    if (!token || token.length < 40 || token.length > 200) return json({ message: "Inicie sessão para carregar imagens." }, 401);

    const tokenHash = await sha256(token);
    const { data: session, error: sessionError } = await supabase.from("Session")
      .select("id,userId,expiresAt,revokedAt").eq("tokenHash", tokenHash).maybeSingle();
    if (sessionError || !session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      return json({ message: "A sessão expirou. Inicie sessão novamente." }, 401);
    }

    const { data: user, error: userError } = await supabase.from("User")
      .select("id,status").eq("id", session.userId).maybeSingle();
    if (userError || !user || user.status !== "ACTIVE") return json({ message: "É necessária uma conta ativa." }, 403);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ message: "Escolha uma fotografia." }, 400);
    if (file.size < 1 || file.size > 5 * 1024 * 1024) return json({ message: "A imagem deve ter até 5 MB." }, 413);

    const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const startsWith = (bytes: number[]) => bytes.every((value, index) => signature[index] === value);
    const isJpeg = startsWith([0xff, 0xd8, 0xff]);
    const isPng = startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const isWebp = signature.length >= 12 &&
      String.fromCharCode(...signature.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
    const mime = isJpeg ? "image/jpeg" : isPng ? "image/png" : isWebp ? "image/webp" : null;
    if (!mime) return json({ message: "Formato não suportado. Usa JPG, PNG ou WebP." }, 415);

    const declared = file.type.toLowerCase().split(";")[0].trim();
    const aliases: Record<string, string> = { "image/jpg": "image/jpeg", "image/pjpeg": "image/jpeg" };
    const normalized = aliases[declared] ?? declared;
    if (normalized && normalized !== "application/octet-stream" && normalized !== mime) {
      return json({ message: "O conteúdo da imagem não corresponde ao formato declarado." }, 415);
    }

    const { data: vendor, error: vendorError } = await supabase.from("Vendor")
      .select("id,status").eq("ownerId", user.id).not("status", "in", '("SUSPENDED","CLOSED")')
      .order("createdAt", { ascending: true }).limit(1).maybeSingle();
    if (vendorError || !vendor) return json({ message: "Abra primeiro uma loja na MARKA." }, 409);

    const extension = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
    const path = `${user.id}/${vendor.id}/${crypto.randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from("marka-marketplace-media").upload(path, bytes, {
      contentType: mime,
      upsert: false,
      cacheControl: "31536000",
    });
    if (uploadError) {
      console.error("[MARKA_MARKETPLACE_MEDIA_UPLOAD]", uploadError.message);
      return json({ message: "Não foi possível guardar a imagem. Tente novamente." }, 500);
    }

    const { data: publicData } = supabase.storage.from("marka-marketplace-media").getPublicUrl(path);
    return json({ imageUrl: publicData.publicUrl, path, contentType: mime, size: file.size });
  } catch (error) {
    console.error("[MARKA_MARKETPLACE_MEDIA_UPLOAD]", error instanceof Error ? error.message : "unknown error");
    return json({ message: "O carregamento da imagem falhou." }, 500);
  }
});
