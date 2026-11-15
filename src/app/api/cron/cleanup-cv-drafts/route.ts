import { NextResponse } from "next/server";

import { prisma } from "@/database/client/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await prisma.markaCvDraft.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("[MARKA_CV_DRAFT_CLEANUP_ERROR]", error);
    return NextResponse.json({ message: "Cleanup failed." }, { status: 500 });
  }
}
