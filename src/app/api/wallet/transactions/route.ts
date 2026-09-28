import { cookies } from "next/headers";
import { walletService } from "@/services/wallet/wallet.service";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AuthConfig.cookies.name)?.value;

    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const session = await new SessionService().validate(token);

    if (!session) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId") ?? undefined;
    const currency = url.searchParams.get("currency") ?? "AOA";
    const limit = Number(url.searchParams.get("limit") ?? "25");

    const transactions = await walletService.listTransactions(
      session.userId,
      organizationId,
      currency,
      limit,
    );

    return Response.json({ transactions }, { status: 200 });
  } catch (error) {
    console.error("[WALLET_TRANSACTIONS_ERROR]", error);

    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load wallet transactions.",
      },
      { status: 400 },
    );
  }
}
