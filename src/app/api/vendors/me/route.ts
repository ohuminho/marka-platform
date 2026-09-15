import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const sessionToken =
      cookieStore.get("marka_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          vendor: null,
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 }
      );
    }

    const sessionService = new SessionService();

    const session =
      await sessionService.validate(sessionToken);

    if (!session) {
      return NextResponse.json(
        {
          vendor: null,
          code: "INVALID_SESSION",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user) {
      await sessionService.revoke(sessionToken);

      return NextResponse.json(
        {
          vendor: null,
          code: "USER_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      await sessionService.revoke(sessionToken);

      return NextResponse.json(
        {
          vendor: null,
          code: "USER_NOT_ACTIVE",
        },
        { status: 403 }
      );
    }

    const vendor =
      await prisma.vendor.findFirst({
        where: {
          ownerId: user.id,
        },
        include: {
          store: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    if (!vendor) {
      return NextResponse.json(
        {
          vendor: null,
          code: "VENDOR_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      vendor,
    });
  } catch (error) {
    console.error(
      "[VENDOR_ME_ERROR]",
      error
    );

    return NextResponse.json(
      {
        vendor: null,
        code: "VENDOR_LOOKUP_FAILED",
      },
      { status: 500 }
    );
  }
}
