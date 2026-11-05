import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AutomationService } from "@/services/automation/automation.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const githubJwks = createRemoteJWKSet(
  new URL("https://token.actions.githubusercontent.com/.well-known/jwks"),
);
const expectedWorkflow = "ohuminho/marka-platform/.github/workflows/automation-worker.yml@refs/heads/main";
const inputSchema = z.object({
  limit: z.number().int().min(1).max(10).default(5),
}).strict();

async function isAuthorized(request: Request): Promise<boolean> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token || token.length > 12000) return false;

  try {
    const { payload } = await jwtVerify(token, githubJwks, {
      issuer: "https://token.actions.githubusercontent.com",
      audience: "marka-automation",
    });
    return payload.repository === "ohuminho/marka-platform"
      && payload.ref === "refs/heads/main"
      && payload.workflow_ref === expectedWorkflow
      && ["schedule", "workflow_dispatch"].includes(String(payload.event_name));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ message: "Acesso interno não autorizado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 1024) {
      return NextResponse.json({ message: "Pedido demasiado grande." }, { status: 413 });
    }
    let body: unknown = {};
    if (rawBody.trim()) {
      try { body = JSON.parse(rawBody); } catch {
        return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
      }
    }
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
    }

    const result = await new AutomationService().processPending(parsed.data.limit);
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[MARKA_AUTOMATION_WORKER]", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ message: "Não foi possível processar a fila de automação." }, { status: 503 });
  }
}
