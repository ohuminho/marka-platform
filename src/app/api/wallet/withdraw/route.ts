import { WalletService } from "@/services/wallet/wallet.service";

const walletService = new WalletService();


export async function POST(
  request: Request
) {

  const body = await request.json();


  const result =
    await walletService.withdraw({
      walletId: body.walletId,
      amount: body.amount,
      reference: body.reference,
      currency: body.currency,
      metadata: body.metadata,
    });


  return Response.json(result);
}
