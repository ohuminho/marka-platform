import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { storeLocationService } from "@/services/stores/store-location.service";

const updateLocationSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
});

function getSessionToken(request: Request): string | null {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)marka_session=([^;]+)/)?.[1] ?? null
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const sessionToken = getSessionToken(request);

    if (!sessionToken) {
      return NextResponse.json(
        {
          message: "Authentication required.",
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 },
      );
    }

    const sessionService = new SessionService();
    const session = await sessionService.validate(sessionToken);

    if (!session) {
      return NextResponse.json(
        {
          message: "Invalid or expired session.",
          code: "INVALID_SESSION",
        },
        { status: 401 },
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
        { status: 401 },
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          message: "User account is not active.",
          code: "USER_NOT_ACTIVE",
        },
        { status: 403 },
      );
    }

    const { id: storeId } = await context.params;

    if (!storeId) {
      return NextResponse.json(
        {
          message: "Store is required.",
          code: "STORE_REQUIRED",
        },
        { status: 400 },
      );
    }

    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
      },
      select: {
        id: true,
        vendor: {
          select: {
            ownerId: true,
            organizationId: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        {
          message: "Store not found.",
          code: "STORE_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    if (store.vendor.ownerId !== user.id) {
      return NextResponse.json(
        {
          message: "You do not have access to this store.",
          code: "STORE_ACCESS_FORBIDDEN",
        },
        { status: 403 },
      );
    }

    const authorization = new AuthorizationService();
    const hasPermission = await authorization.hasPermission(
      user.id,
      Permissions.VENDOR_UPDATE,
      store.vendor.organizationId,
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          message: "You do not have permission to update this store.",
          code: "STORE_UPDATE_FORBIDDEN",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = updateLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid store location data.",
          code: "INVALID_STORE_LOCATION",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updated = await storeLocationService.updateLocation({
      storeId,
      organizationId: store.vendor.organizationId,
      actorUserId: user.id,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    });

    return NextResponse.json({
      store: updated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error.";

    if (message === "INVALID_STORE_LATITUDE") {
      return NextResponse.json(
        {
          message: "Store latitude must be between -90 and 90.",
          code: message,
        },
        { status: 400 },
      );
    }

    if (message === "INVALID_STORE_LONGITUDE") {
      return NextResponse.json(
        {
          message: "Store longitude must be between -180 and 180.",
          code: message,
        },
        { status: 400 },
      );
    }

    console.error("[STORE_LOCATION_UPDATE_ERROR]", error);

    return NextResponse.json(
      {
        message: "Unable to update store location.",
        code: "STORE_LOCATION_UPDATE_FAILED",
      },
      { status: 500 },
    );
  }
}
