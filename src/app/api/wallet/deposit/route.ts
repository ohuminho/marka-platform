export async function POST() {
  return Response.json(
    {
      message:
        "Wallet deposits are processed through the MARKA Payment flow. Direct wallet balance mutation is disabled.",
      code:
        "WALLET_DEPOSIT_REQUIRES_PAYMENT_FLOW",
    },
    {
      status: 409,
    }
  );
}
