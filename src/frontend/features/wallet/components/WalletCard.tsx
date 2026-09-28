"use client";

export default function WalletCard({
  balanceMinor = "0",
  heldBalanceMinor = "0",
  availableBalanceMinor = "0",
  currency = "AOA",
}: {
  balanceMinor?: string;
  heldBalanceMinor?: string;
  availableBalanceMinor?: string;
  currency?: string;
}) {
  const formatMoney = (minor: string) => {
    const value = Number(minor) / 100;
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  };

  return (
    <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 backdrop-blur-2xl">
      <p className="text-[var(--theme-text-muted)]">MARKA Wallet</p>

      <h2 className="mt-4 text-5xl font-semibold">
        {formatMoney(availableBalanceMinor)} {currency}
      </h2>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-[var(--theme-text-muted)]">Total balance</p>
          <p className="mt-1 font-medium">{formatMoney(balanceMinor)} {currency}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--theme-text-muted)]">Held</p>
          <p className="mt-1 font-medium">{formatMoney(heldBalanceMinor)} {currency}</p>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <button type="button" disabled title="Deposits are processed through the MARKA Payment flow." className="cursor-not-allowed rounded-full bg-[var(--theme-accent)] px-5 py-3 text-[var(--theme-background)] opacity-50">
          Deposit
        </button>
        <button type="button" disabled title="Withdrawals are processed through the MARKA Settlement flow." className="cursor-not-allowed rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-5 py-3 opacity-50">
          Withdraw
        </button>
      </div>

      <p className="mt-5 text-sm text-[var(--theme-text-faint)]">
        Payments and withdrawals are processed through MARKA&apos;s financial rails.
      </p>
    </div>
  );
}
