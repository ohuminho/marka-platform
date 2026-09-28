"use client";

import { useEffect, useState } from "react";

interface WalletTransaction {
  id: string;
  type: string;
  status: string;
  direction: string;
  amountMinor: string;
  currency: string;
  reference: string;
  referenceType: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function TransactionList({
  organizationId,
}: {
  organizationId?: string;
}) {
  const [
    transactions,
    setTransactions,
  ] = useState<
    WalletTransaction[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    const load =
      async () => {
        try {
          const query =
            organizationId
              ? `?organizationId=${encodeURIComponent(
                  organizationId
                )}`
              : "";

          const response =
            await fetch(
              `/api/wallet/transactions${query}`,
              {
                credentials:
                  "include",
                cache:
                  "no-store",
              }
            );

          if (!response.ok) {
            setTransactions([]);
            return;
          }

          const data =
            await response.json();

          setTransactions(
            Array.isArray(
              data.transactions
            )
              ? data.transactions
              : []
          );
        } catch (error) {
          console.error(
            "[WALLET_TRANSACTIONS_UI_ERROR]",
            error
          );

          setTransactions([]);
        } finally {
          setLoading(false);
        }
      };

    load();
  }, [organizationId]);

  const formatMoney = (
    amountMinor: string,
    currency: string
  ) => {
    return `${new Intl.NumberFormat(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(
      Number(amountMinor) /
        100
    )} ${currency}`;
  };

  return (
    <div
      className="
        rounded-3xl
        p-8
        bg-[var(--theme-surface-strong)]/5
        border
        border-[var(--theme-border)]
      "
    >
      <h3
        className="
          text-2xl
          font-semibold
        "
      >
        Transactions
      </h3>

      {loading ? (
        <p className="text-[var(--theme-text-muted)] mt-4">
          Loading transactions...
        </p>
      ) : transactions.length === 0 ? (
        <p className="text-[var(--theme-text-muted)] mt-4">
          No transactions yet.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {transactions.map(
            (transaction) => {
              const incoming =
                transaction.direction ===
                "CREDIT";

              return (
                <div
                  key={
                    transaction.id
                  }
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    rounded-2xl
                    border
                    border-[var(--theme-border)]
                    bg-[var(--theme-surface-strong)]/5
                    p-4
                  "
                >
                  <div>
                    <p className="font-medium">
                      {
                        transaction.type
                      }
                    </p>

                    <p className="text-sm text-neutral-500">
                      {
                        transaction.reference
                      }
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={
                        incoming
                          ? "font-medium"
                          : "font-medium"
                      }
                    >
                      {incoming
                        ? "+"
                        : "-"}
                      {formatMoney(
                        transaction.amountMinor,
                        transaction.currency
                      )}
                    </p>

                    <p className="text-xs text-neutral-500">
                      {
                        transaction.status
                      }
                    </p>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
