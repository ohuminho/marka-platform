import { WalletService } from "@/services/wallet/wallet.service";

const walletService =
  new WalletService();


export async function GET(
  request: Request
) {

  const userId =
    request.headers.get(
      "x-user-id"
    );


  if (!userId) {
    return Response.json(
      {
        message: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }


  const wallet =
    await walletService.getWallet(
      userId
    );


  return Response.json(wallet);
}
