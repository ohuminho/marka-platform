export async function POST() {
  return Response.json(
    {
      message:
        "Wallet withdrawals are processed through the MARKA Settlement flow. Direct wallet balance mutation is disabled.",
      code:
        "WALLET_WITHDRAWAL_REQUIRES_SETTLEMENT_FLOW",
    },
    {
      status: 409,
    }
  );
}
