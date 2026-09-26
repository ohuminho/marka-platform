"use client";

import { useCallback, useEffect, useState } from "react";

interface Payment {
  id: string;
  orderId: string | null;
  transactionId: string | null;
  amountMinor: string;
  currency: string;
  status: string;
  provider: string | null;
  providerPaymentId: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentListResponse {
  payments: Payment[];
  total: number;
  limit: number;
  offset: number;
}

function formatAmount(
  amountMinor: string,
  currency: string
): string {
  const amount = Number(amountMinor) / 100;

  if (!Number.isFinite(amount)) {
    return `${amountMinor} ${currency}`;
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "CREATED":
      return "Created";
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "REFUNDED":
      return "Refunded";
    default:
      return status;
  }
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/payments?limit=20&offset=0",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as
          | PaymentListResponse
          | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Unable to load payment history."
        );
      }

      setPayments(
        "payments" in data
          ? data.payments
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load payment history."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            Payment history
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Recent payments associated with your orders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadPayments()}
          disabled={loading}
          className="rounded-lg border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
          Loading payment history...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
          No payments found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-3 font-medium">
                  Payment
                </th>
                <th className="px-3 py-3 font-medium">
                  Order
                </th>
                <th className="px-3 py-3 font-medium">
                  Provider
                </th>
                <th className="px-3 py-3 font-medium">
                  Status
                </th>
                <th className="px-3 py-3 text-right font-medium">
                  Amount
                </th>
                <th className="px-3 py-3 font-medium">
                  Date
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b last:border-0"
                >
                  <td className="px-3 py-4">
                    <div className="font-medium">
                      {payment.id}
                    </div>

                    {payment.transactionId && (
                      <div className="mt-1 text-xs text-gray-500">
                        Transaction:{" "}
                        {payment.transactionId}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-4">
                    {payment.orderId ?? "—"}
                  </td>

                  <td className="px-3 py-4">
                    {payment.provider ?? "—"}
                  </td>

                  <td className="px-3 py-4">
                    <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                      {getStatusLabel(
                        payment.status
                      )}
                    </span>
                  </td>

                  <td className="px-3 py-4 text-right font-medium">
                    {formatAmount(
                      payment.amountMinor,
                      payment.currency
                    )}
                  </td>

                  <td className="px-3 py-4 text-gray-600">
                    {formatDate(
                      payment.createdAt
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
