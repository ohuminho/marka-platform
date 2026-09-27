import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { vendorSalesService } from "@/services/vendors/vendor-sales.service";

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
