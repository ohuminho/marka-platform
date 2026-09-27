import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/authentication/sessions/session.service";
import { customerDeliveryTrackingService } from "@/services/delivery/customer-delivery-tracking.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AuthConfig.cookies.name)?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required.", code: "AUTHENTICATION_REQUIRED" },
        { status: 401 },
      );
    }

    const session = await new SessionService().validate(token);
    if (!session) {
      return NextResponse.json(
        { message: "Invalid or expired session.", code: "INVALID_SESSION" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const tracking = await customerDeliveryTrackingService.getForOrder(
      id.trim(),
      session.userId,
    );

    return NextResponse.json({ tracking });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        { message: "Order not found.", code: "ORDER_NOT_FOUND" },
        { status: 404 },
      );
    }

    console.error("[DELIVERY_TRACKING_GET_ERROR]", error);
    return NextResponse.json(
      { message: "Unable to load delivery tracking.", code: "DELIVERY_TRACKING_LOAD_FAILED" },
      { status: 500 },
    );
  }
}
