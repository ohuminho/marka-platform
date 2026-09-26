"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number | string;
  subtotal: number | string;
  product?: {
    id: string;
    name: string;
    price?: number | string;
    currency?: string;
  } | null;
}

interface CartData {
  id: string;
  userId: string;
  items: CartItem[];
  total?: number | string;
  currency?: string;
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(
  amountMinor: number | string,
  currency = "AOA",
): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(amountMinor) / 100);
}

export default function CartPage() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  async function loadCart() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/cart", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ?? "Unable to load your cart.",
        );
      }

      setCart(data?.cart ?? data ?? null);
    } catch (loadError) {
      console.error("[CART_PAGE_ERROR]", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your cart.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCart();
  }, []);

  async function removeItem(itemId: string) {
    try {
      setRemovingItemId(itemId);
      setError(null);

      const response = await fetch(
        `/api/cart/items/${encodeURIComponent(itemId)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ?? "Unable to remove item from cart.",
        );
      }

      await loadCart();
    } catch (removeError) {
      console.error("[CART_REMOVE_ITEM_ERROR]", removeError);

      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove item from cart.",
      );
    } finally {
      setRemovingItemId(null);
    }
  }

  async function checkout() {
    if (!cart || cart.items.length === 0) {
      return;
    }

    try {
      setCheckingOut(true);
      setCheckoutMessage(null);
      setError(null);

      const response = await fetch("/api/checkout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cartId: cart.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ?? "Unable to complete checkout.",
        );
      }

      const orderId = data?.orderId ?? data?.order?.id;

      if (orderId) {
        window.location.href = `/app/orders/${encodeURIComponent(
          orderId,
        )}`;
        return;
      }

      setCheckoutMessage(
        "Checkout completed successfully.",
      );
    } catch (checkoutError) {
      console.error("[CART_CHECKOUT_ERROR]", checkoutError);

      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to complete checkout.",
      );
    } finally {
      setCheckingOut(false);
    }
  }

  const calculatedTotal = useMemo(() => {
    if (!cart) {
      return 0;
    }

    return cart.items.reduce(
      (total, item) => total + toNumber(item.subtotal),
      0,
    );
  }, [cart]);

  const currency = cart?.currency ?? "AOA";

  if (loading) {
    return (
      <main className="space-y-6">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-white/5" />
        </div>

        <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">
          Shopping cart
        </h1>

        <p className="mt-1 text-sm text-white/50">
          Review your products before checkout.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {checkoutMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          {checkoutMessage}
        </div>
      )}

      {!cart || cart.items.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <h2 className="text-lg font-medium text-white">
            Your cart is empty
          </h2>

          <p className="mt-2 text-sm text-white/50">
            Add products from the marketplace to continue.
          </p>

          <Link
            href="/app/marketplace"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Browse marketplace
          </Link>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-semibold text-white">
                Cart items
              </h2>
            </div>

            <div className="divide-y divide-white/10">
              {cart.items.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="font-medium text-white">
                      {item.product?.name ?? `Product ${item.productId}`}
                    </h3>

                    <p className="mt-1 text-sm text-white/50">
                      Quantity: {item.quantity}
                    </p>

                    <p className="mt-1 text-xs text-white/35">
                      Unit price:{" "}
                      {formatMoney(item.unitPrice, currency)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="font-medium text-white">
                      {formatMoney(item.subtotal, currency)}
                    </span>

                    <button
                      type="button"
                      onClick={() => void removeItem(item.id)}
                      disabled={removingItemId === item.id}
                      className="rounded-lg border border-red-500/20 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removingItemId === item.id
                        ? "Removing..."
                        : "Remove"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold text-white">
              Summary
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between text-white/60">
                <span>Items</span>
                <span>{cart.items.length}</span>
              </div>

              <div className="flex items-center justify-between text-white/60">
                <span>Subtotal</span>
                <span>
                  {formatMoney(
                    cart.total ?? calculatedTotal,
                    currency,
                  )}
                </span>
              </div>

              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">
                    Total
                  </span>

                  <span className="text-lg font-semibold text-white">
                    {formatMoney(
                      cart.total ?? calculatedTotal,
                      currency,
                    )}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void checkout()}
              disabled={checkingOut || cart.items.length === 0}
              className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkingOut ? "Processing..." : "Proceed to checkout"}
            </button>

            <Link
              href="/app/marketplace"
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
