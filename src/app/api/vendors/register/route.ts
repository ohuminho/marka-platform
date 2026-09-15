import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { VendorService } from "@/services/vendors/vendor.service";

const registerVendorSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(2, "Store name must contain at least 2 characters.")
    .max(160, "Store name is too long."),

  organizationId: z
    .string()
    .uuid("Invalid organization ID.")
    .optional(),
});

export async function POST(request: Request) {
  try {
    const sessionToken =
      request.headers.get("cookie")?.match(
        /(?:^|;\s*)marka_session=([^;]+)/
      )?.[1];

    if (!sessionToken) {
      return NextResponse.json(
        {
          message: "Authentication required.",
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
          message: "Invalid or expired session.",
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
          message: "User account was not found.",
          code: "USER_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      await sessionService.revoke(sessionToken);

      return NextResponse.json(
        {
          message: "User account is not active.",
          code: "USER_NOT_ACTIVE",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const parsed =
      registerVendorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid vendor registration data.",
          code: "INVALID_VENDOR_DATA",
          errors:
            parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      storeName,
      organizationId,
    } = parsed.data;

    const authorization =
      new AuthorizationService();

    const hasPermission =
      await authorization.hasPermission(
        user.id,
        Permissions.VENDOR_CREATE,
        organizationId
      );

    if (!hasPermission) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to create a vendor.",
          code: "VENDOR_CREATE_FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const service = new VendorService();

    const vendor =
      await service.createVendor(
        user.id,
        storeName,
        organizationId
      );

    return NextResponse.json(
      {
        vendor,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[VENDOR_REGISTER_ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to complete vendor registration.",
        code: "VENDOR_REGISTRATION_FAILED",
      },
      { status: 500 }
    );
  }
}
