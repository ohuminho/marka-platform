import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { vendorSalesService } from "@/services/vendors/vendor-sales.service";
import { prisma } from "@/database/client/prisma";

export async function GET(request: Request) {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    if (!token) return NextResponse.json({ message: "Authentication required.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });

    const session = await new SessionService().validate(token);
    if (!session) return NextResponse.json({ message: "Invalid or expired session.", code: "INVALID_SESSION" }, { status: 401 });

    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId")?.trim();
    const status = url.searchParams.get("status")?.trim();
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    if (!organizationId) return NextResponse.json({ message: "Organization is required.", code: "ORGANIZATION_REQUIRED" }, { status: 400 });

    const authorization = new AuthorizationService();
    if (!(await authorization.hasPermission(session.userId, Permissions.ORDER_READ, organizationId))) {
      return NextResponse.json({ message: "You do not have permission to view vendor sales.", code: "VENDOR_SALES_FORBIDDEN" }, { status: 403 });
    }

    const membership = await prisma.organizationMembership.findFirst({
      where: { organizationId, userId: session.userId, status: "ACTIVE", organization: { status: "ACTIVE" } },
      select: { id: true },
    });
    if (!membership) return NextResponse.json({ message: "Organization access denied.", code: "ORGANIZATION_ACCESS_DENIED" }, { status: 403 });

    return NextResponse.json(await vendorSalesService.listSales({ userId: session.userId, organizationId, status, limit, offset }));
  } catch (error) {
    console.error("[VENDOR_SALES_GET_ERROR]", error);
    if (error instanceof Error && error.message === "VENDOR_NOT_FOUND") {
      return NextResponse.json({ message: "Vendor not found.", code: "VENDOR_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ message: "Unable to load vendor sales.", code: "VENDOR_SALES_LOAD_FAILED" }, { status: 500 });
  }
}


const updateSchema = z.object({
  organizationId: z.string().min(1),
  orderId: z.string().min(1),
  status: z.enum(["CONFIRMED", "PROCESSING", "CANCELLED"]),
});

export async function PATCH(request: Request) {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    if (!token) return NextResponse.json({ message: "Authentication required.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });

    const session = await new SessionService().validate(token);
    if (!session) return NextResponse.json({ message: "Invalid or expired session.", code: "INVALID_SESSION" }, { status: 401 });

    const body = updateSchema.parse(await request.json());
    const authorization = new AuthorizationService();
    if (!(await authorization.hasPermission(session.userId, Permissions.ORDER_MANAGE, body.organizationId))) {
      return NextResponse.json({ message: "Vendor order management permission required.", code: "FORBIDDEN" }, { status: 403 });
    }

    const result = await vendorSalesService.updateSaleStatus({
      userId: session.userId,
      organizationId: body.organizationId,
      orderId: body.orderId,
      status: body.status,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid request.", code: "INVALID_REQUEST", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "VENDOR_NOT_FOUND") return NextResponse.json({ message: "Vendor not found.", code: message }, { status: 404 });
    if (message === "ORDER_NOT_FOUND") return NextResponse.json({ message: "Order not found.", code: message }, { status: 404 });
    if (message.startsWith("INVALID_VENDOR_ORDER_TRANSITION")) return NextResponse.json({ message: "Order status transition is not allowed.", code: "INVALID_ORDER_TRANSITION" }, { status: 409 });
    console.error("[VENDOR_SALES_PATCH_ERROR]", error);
    return NextResponse.json({ message: "Unable to update order.", code: "VENDOR_ORDER_UPDATE_FAILED" }, { status: 500 });
  }
}
