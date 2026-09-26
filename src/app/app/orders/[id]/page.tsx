"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface OrderItem {
  id: string;
  productId: string;
  storeId: string;
  vendorId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderPayment {
  id: string;
  transactionId: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  providerPaymentId: string | null;
}

interface OrderDetail {
  id: string;
  userId: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: OrderPayment[];
}

interface OrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatMoney(
  amountMinor: number,
  currency: string
) {
  return new Intl.NumberFormat(
    undefined,
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(amountMinor / 100);
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

function label(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /^\w/,
      (character) =>
        character.toUpperCase()
    );
}

export default function OrderDetailPage({
  params,
}: OrderPageProps) {
  const [
    orderId,
    setOrderId,
  ] = useState<string | null>(
    null
  );

  const [
    order,
    setOrder,
  ] = useState<OrderDetail | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    let active = true;

    const loadOrder =
      async () => {
        try {
          const resolvedParams =
            await params;

          const id =
            resolvedParams.id.trim();

          if (!id) {
            throw new Error(
              "Order id is required."
            );
          }

          if (active) {
            setOrderId(id);
          }

          const response =
            await fetch(
              `/api/orders/${encodeURIComponent(
                id
              )}`,
              {
                credentials:
                  "include",
                cache:
                  "no-store",
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.message ??
                "Unable to load order."
            );
          }

          if (active) {
            setOrder(data);
          }
        } catch (error) {
          console.error(
            "[ORDER_DETAIL_PAGE_ERROR]",
            error
          );

          if (active) {
            setError(
              error instanceof Error
                ? error.message
                : "Unable to load order."
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    loadOrder();

    return () => {
      active = false;
    };
  }, [params]);

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="h-8 w-40 animate-pulse rounded bg-white/10" />

        <div className="mt-8 h-48 animate-pulse rounded-3xl bg-white/5" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen p-8">
        <Link
          href="/app/orders"
          className="text-sm text-white/50 hover:text-white"
        >
          ← Back to Orders
        </Link>

        <section className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
          <h1 className="text-2xl font-semibold">
            Unable to load order
          </h1>

          <p className="mt-3 text-white/50">
            {error ??
              "The requested order could not be found."}
          </p>

          {orderId && (
            <p className="mt-4 break-all font-mono text-xs text-white/30">
              {orderId}
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <Link
        href="/app/orders"
        className="text-sm text-white/50 hover:text-white"
      >
        ← Back to Orders
      </Link>

      <header className="mt-8">
        <p className="text-xs uppercase tracking-[0.18em] text-white/40">
          Order
        </p>

        <h1 className="mt-2 break-all font-mono text-2xl font-semibold">
          {order.id}
        </h1>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/50">
          <span>
            {label(order.status)}
          </span>

          <span>
            {formatDate(
              order.createdAt
            )}
          </span>
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div
          className="
            rounded-3xl
            border
            border-white/10
            bg-white/5
            p-6
          "
        >
          <h2 className="text-xl font-semibold">
            Items
          </h2>

          <div className="mt-6 space-y-4">
            {order.items.map(
              (item) => (
                <div
                  key={item.id}
                  className="
                    rounded-2xl
                    border
                    border-white/10
                    p-4
                  "
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        Product
                      </p>

                      <p className="mt-1 break-all font-mono text-xs text-white/40">
                        {item.productId}
                      </p>
                    </div>

                    <p className="font-semibold">
                      {formatMoney(
                        item.subtotal,
                        order.currency
                      )}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/40">
                    <span>
                      Quantity:{" "}
                      {item.quantity}
                    </span>

                    <span>
                      Unit:{" "}
                      {formatMoney(
                        item.unitPrice,
                        order.currency
                      )}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div
            className="
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-6
            "
          >
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">
              Order Total
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {formatMoney(
                order.total,
                order.currency
              )}
            </p>

            <p className="mt-3 text-sm text-white/40">
              {label(order.status)}
            </p>
          </div>

          <div
            className="
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-6
            "
          >
            <h2 className="text-xl font-semibold">
              Payments
            </h2>

            {order.payments.length ===
            0 ? (
              <p className="mt-4 text-sm text-white/40">
                No payment recorded for this order yet.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {order.payments.map(
                  (payment) => (
                    <div
                      key={payment.id}
                      className="
                        rounded-2xl
                        border
                        border-white/10
                        p-4
                      "
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-white/50">
                          {label(
                            payment.status
                          )}
                        </span>

                        <span className="font-medium">
                          {formatMoney(
                            payment.amount,
                            payment.currency
                          )}
                        </span>
                      </div>

                      {payment.provider && (
                        <p className="mt-2 text-xs text-white/30">
                          Provider:{" "}
                          {payment.provider}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
