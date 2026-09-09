export class WalletService {
  deposit(amount: number) {
    return {
      balanceUpdated: true,
      amount,
    };
  }
}
