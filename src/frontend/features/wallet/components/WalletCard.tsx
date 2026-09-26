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
  const formatMoney = (
    minor: string
  ) => {
    const value =
      Number(minor) / 100;

    return new Intl.NumberFormat(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(
      Number.isFinite(value)
        ? value
        : 0
    );
  };

  return (
    <div
      className="
        rounded-3xl
        p-8
        bg-white/10
        backdrop-blur-2xl
        border
        border-white/10
      "
    >
      <p className="text-neutral-400">
        MARKA Wallet
      </p>

      <h2
        className="
          text-5xl
          font-semibold
          mt-4
        "
      >
        {formatMoney(
          availableBalanceMinor
        )}{" "}
        {currency}
      </h2>

      <div
        className="
          grid
          grid-cols-2
          gap-4
          mt-8
        "
      >
        <div>
          <p className="text-sm text-neutral-400">
            Total balance
          </p>

          <p className="mt-1 font-medium">
            {formatMoney(
              balanceMinor
            )}{" "}
            {currency}
          </p>
        </div>

        <div>
          <p className="text-sm text-neutral-400">
            Held
          </p>

          <p className="mt-1 font-medium">
            {formatMoney(
              heldBalanceMinor
            )}{" "}
            {currency}
          </p>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          type="button"
          disabled
          title="Deposits are processed through the MARKA Payment flow."
          className="
            px-5
            py-3
            rounded-full
            bg-white
            text-black
            opacity-50
            cursor-not-allowed
          "
        >
          Deposit
        </button>

        <button
          type="button"
          disabled
          title="Withdrawals are processed through the MARKA Settlement flow."
          className="
            px-5
            py-3
            rounded-full
            bg-white/10
            border
            border-white/20
            opacity-50
            cursor-not-allowed
          "
        >
          Withdraw
        </button>
      </div>

      <p className="mt-5 text-sm text-neutral-500">
        Payments and withdrawals are processed
        through MARKA&apos;s financial rails.
      </p>
    </div>
  );
}
