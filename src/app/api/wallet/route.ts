import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { walletService } from "@/services/wallet/wallet.service";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AuthConfig.cookies.name)?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const session = await new SessionService().validate(token);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const organizationId =
      url.searchParams.get("organizationId") ?? undefined;

    const wallet = await walletService.getWallet(
      session.userId,
      organizationId,
    );

    return NextResponse.json(wallet, { status: 200 });
  } catch (error) {
    console.error("[WALLET_API_ERROR]", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load wallet.",
      },
      { status: 400 },
    );
  }
}
