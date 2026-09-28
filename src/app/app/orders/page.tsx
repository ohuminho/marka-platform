"use client";

import Link from "next/link";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";
import { useEffect, useState } from "react";

interface OrderSummary {
  id: string;
  userId: string;
  status: string;
  total: number;
  createdAt: string;
}

function formatMoney(
  amount: number,
  currency = "AOA"
) {
  return new Intl.NumberFormat(
    undefined,
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(amount);
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

function statusLabel(
  status: string
) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /^\w/,
      (character) =>
        character.toUpperCase()
    );
}

export default function OrdersPage() {
  const [
    orders,
    setOrders,
  ] = useState<OrderSummary[]>([]);

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

    const loadOrders =
      async () => {
        try {
          setLoading(true);
          setError(null);

          const response =
            await fetch(
              "/api/orders",
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
                "Unable to load orders."
            );
          }

          if (!active) {
            return;
          }

          setOrders(
            Array.isArray(data)
              ? data
              : []
          );
        } catch (error) {
          console.error(
            "[ORDERS_PAGE_ERROR]",
            error
          );

          if (!active) {
            return;
          }

          setError(
            error instanceof Error
              ? error.message
              : "Unable to load orders."
          );
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    loadOrders();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen space-y-8 p-8">
        <RoleContextSummary />

      <section className="mb-10">
          <h1 className="text-4xl font-semibold">
            Orders
          </h1>

          <p className="mt-3 text-white/50">
            Loading your order history...
          </p>
        </section>

        <div className="space-y-4">
          {[
            "order-skeleton-1",
            "order-skeleton-2",
            "order-skeleton-3",
          ].map((key) => (
            <div
              key={key}
              className="
                h-28
                animate-pulse
                rounded-3xl
                border
                border-white/10
                bg-white/5
              "
            />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen space-y-8 p-8">
        <RoleContextSummary />
        <section className="mb-10">
          <h1 className="text-4xl font-semibold">
            Orders
          </h1>

          <p className="mt-3 text-white/50">
            Your purchases and order activity.
          </p>
        </section>

        <div
          className="
            rounded-3xl
            border
            border-red-500/20
            bg-red-500/5
            p-6
          "
        >
          <p className="font-medium">
            Unable to load orders
          </p>

          <p className="mt-2 text-sm text-white/50">
            {error}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-8 p-8">
      <RoleContextSummary />
      <section className="mb-10">
        <h1 className="text-4xl font-semibold">
          Orders
        </h1>

        <p className="mt-3 text-white/50">
          Track your purchases and order activity.
        </p>
      </section>

      {orders.length === 0 ? (
        <section
          className="
            rounded-3xl
            border
            border-white/10
            bg-white/5
            p-10
            text-center
          "
        >
          <h2 className="text-2xl font-semibold">
            No orders yet
          </h2>

          <p className="mt-3 text-white/50">
            Your marketplace purchases will appear here.
          </p>

          <Link
            href="/app/marketplace"
            className="
              mt-6
              inline-flex
              rounded-full
              bg-white
              px-6
              py-3
              text-sm
              font-semibold
              text-black
              transition
              hover:bg-white/90
            "
          >
            Explore Marketplace
          </Link>
        </section>
      ) : (
        <section className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/app/orders/${order.id}`}
              className="
                block
                rounded-3xl
                border
                border-white/10
                bg-white/5
                p-6
                transition
                hover:border-white/20
                hover:bg-white/[0.07]
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-5
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                    Order
                  </p>

                  <p className="mt-2 break-all font-mono text-sm text-white/70">
                    {order.id}
                  </p>

                  <p className="mt-2 text-sm text-white/40">
                    {formatDate(
                      order.createdAt
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-8 md:justify-end">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                      Status
                    </p>

                    <p className="mt-2 font-medium">
                      {statusLabel(
                        order.status
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                      Total
                    </p>

                    <p className="mt-2 text-lg font-semibold">
                      {formatMoney(
                        order.total
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
