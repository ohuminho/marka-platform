import { walletService } from "@/services/wallet/wallet.service";

export async function GET(
  request: Request
) {
  try {
    const userId =
      request.headers.get(
        "x-user-id"
      );

    if (!userId) {
      return Response.json(
        {
          message:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const url =
      new URL(
        request.url
      );

    const organizationId =
      url.searchParams.get(
        "organizationId"
      ) ?? undefined;

    const currency =
      url.searchParams.get(
        "currency"
      ) ?? "AOA";

    const limit =
      Number(
        url.searchParams.get(
          "limit"
        ) ?? "25"
      );

    const transactions =
      await walletService.listTransactions(
        userId,
        organizationId,
        currency,
        limit
      );

    return Response.json(
      {
        transactions,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "[WALLET_TRANSACTIONS_ERROR]",
      error
    );

    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load wallet transactions.",
      },
      {
        status: 400,
      }
    );
  }
}
