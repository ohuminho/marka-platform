import { WalletService } from "@/services/wallet/wallet.service";

const walletService =
  new WalletService();


export async function POST(
  request: Request
) {

  const body =
    await request.json();


  const result =
    await walletService.withdraw(
      body.userId,
      body.amount
    );


  return Response.json(result);
}
