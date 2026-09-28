"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

type CartItem = {
  id: string;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
  product?: {
    id: string;
    name: string;
    imageUrl?: string | null;
  };
};

type Cart = {
  id: string;
  status?: string;
  currency?: string;
  items: CartItem[];
  subtotal?: string | number;
  total?: string | number;
};

type ApiResponse = {
  cart?: Cart;
  id?: string;
  userId?: string;
  status?: string;
  currency?: string;
  items?: Array<{
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      price: string | number;
      image?: string | null;
    };
  }>;
  error?: string;
  message?: string;
  orderId?: string;
  payment?: {
    id: string;
    status: string;
  };
};

function formatMoney(
  value: string | number | undefined,
  currency = "AOA",
): string {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function CartPage() {
  const router = useRouter();

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLatitude, setDeliveryLatitude] = useState("");
  const [deliveryLongitude, setDeliveryLongitude] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/cart", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Não foi possível carregar o carrinho.",
        );
      }

      const rawCart = data.cart ?? (
        data.id && data.items
          ? {
              id: data.id,
              userId: data.userId,
              status: data.status,
              currency: data.currency,
              items: data.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                unitPrice: item.product.price,
                subtotal: Number(item.product.price) * item.quantity,
                product: {
                  id: item.product.id,
                  name: item.product.name,
                  imageUrl: item.product.image ?? null,
                },
              })),
            }
          : null
      );

      if (!rawCart) {
        throw new Error("Resposta de carrinho inválida.");
      }

      setCart(rawCart as Cart);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar o carrinho.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCart();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCart]);

  async function removeItem(itemId: string) {
    try {
      setRemovingItemId(itemId);
      setError(null);

      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Não foi possível remover o item.",
        );
      }

      await loadCart();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível remover o item.",
      );
    } finally {
      setRemovingItemId(null);
    }
  }

  async function checkout() {
    if (!cart?.id || checkingOut) {
      return;
    }

    if (!deliveryAddress.trim()) {
      setError("Informe o endereço de entrega.");
      return;
    }

    const latitude = Number(deliveryLatitude);
    const longitude = Number(deliveryLongitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setError("Informe uma latitude de entrega válida.");
      return;
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError("Informe uma longitude de entrega válida.");
      return;
    }

    try {
      setCheckingOut(true);
      setError(null);

      const idempotencyKey =
        paymentIdempotencyKey || crypto.randomUUID();

      if (!paymentIdempotencyKey) {
        setPaymentIdempotencyKey(idempotencyKey);
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cartId: cart.id,
          paymentIdempotencyKey: idempotencyKey,
          delivery: {
            address: deliveryAddress.trim(),
            latitude,
            longitude,
            instructions: deliveryInstructions.trim() || undefined,
          },
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Não foi possível concluir o checkout.",
        );
      }

      if (!data.orderId) {
        throw new Error(
          "O checkout foi processado, mas não foi devolvido um pedido.",
        );
      }

      router.push(`/app/orders/${data.orderId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir o checkout.",
      );
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <RoleContextSummary />
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-[var(--theme-surface)]" />
          <div className="h-24 rounded-lg bg-[var(--theme-surface)]" />
          <div className="h-24 rounded-lg bg-[var(--theme-surface)]" />
        </div>
      </main>
    );
  }

  if (error && !cart) {
    return (
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <RoleContextSummary />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={() => void loadCart()}
            className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-[var(--theme-text)] hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <RoleContextSummary />
        <div className="mb-6">
          <p className="marka-kicker">MARKA CART</p>
          <h1 className="marka-editorial mt-2 text-4xl text-[var(--theme-text)]">Carrinho</h1>
          <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
            Revise os produtos antes de finalizar a compra.
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-10 text-center shadow-none">
          <h2 className="marka-editorial text-3xl text-[var(--theme-text)]">
            O carrinho está vazio
          </h2>

          <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
            Adicione produtos ao carrinho para iniciar uma compra.
          </p>

          <button
            type="button"
            onClick={() => router.push("/app/marketplace")}
            className="mt-5 rounded-md bg-[var(--theme-background)] px-5 py-2.5 text-sm font-medium text-[var(--theme-text)] hover:bg-[var(--theme-surface-strong)]"
          >
            Explorar marketplace
          </button>
        </div>
      </main>
    );
  }

  const currency = cart.currency || "AOA";

  const calculatedSubtotal = cart.items.reduce(
    (total, item) => total + Number(item.subtotal ?? 0),
    0,
  );

  const subtotal = Number(cart.subtotal ?? calculatedSubtotal);
  const total = Number(cart.total ?? subtotal);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <RoleContextSummary />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--theme-text)]">Carrinho</h1>
        <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
          Revise os produtos e finalize a sua compra.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          {cart.items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-4 shadow-sm"
            >
              <div className="flex gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--theme-surface)]">
                  {item.product?.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-[var(--theme-text-faint)]">Sem imagem</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-[var(--theme-text)]">
                    {item.product?.name || "Produto"}
                  </h2>

                  <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
                    Quantidade: {item.quantity}
                  </p>

                  <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
                    Preço unitário:{" "}
                    {formatMoney(item.unitPrice, currency)}
                  </p>

                  <p className="mt-2 font-semibold text-[var(--theme-text)]">
                    {formatMoney(item.subtotal, currency)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void removeItem(item.id)}
                  disabled={removingItemId === item.id || checkingOut}
                  className="self-start rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {removingItemId === item.id ? "A remover..." : "Remover"}
                </button>
              </div>
            </article>
          ))}
        </section>

        <aside className="h-fit rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--theme-text)]">
            Resumo da compra
          </h2>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--theme-text-muted)]">Subtotal</span>
              <span className="font-medium text-[var(--theme-text)]">
                {formatMoney(subtotal, currency)}
              </span>
            </div>

            <div className="border-t border-[var(--theme-border)] pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--theme-text)]">Total</span>
                <span className="text-lg font-bold text-[var(--theme-text)]">
                  {formatMoney(total, currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-[var(--theme-border)] pt-5">
            <h3 className="text-sm font-semibold text-[var(--theme-text)]">Entrega</h3>
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                placeholder="Endereço de entrega"
                className="w-full rounded-md border border-[var(--theme-border)] px-3 py-2 text-sm outline-none focus:border-[var(--theme-accent)]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="any"
                  value={deliveryLatitude}
                  onChange={(event) => setDeliveryLatitude(event.target.value)}
                  placeholder="Latitude"
                  className="w-full rounded-md border border-[var(--theme-border)] px-3 py-2 text-sm outline-none focus:border-[var(--theme-accent)]"
                />
                <input
                  type="number"
                  step="any"
                  value={deliveryLongitude}
                  onChange={(event) => setDeliveryLongitude(event.target.value)}
                  placeholder="Longitude"
                  className="w-full rounded-md border border-[var(--theme-border)] px-3 py-2 text-sm outline-none focus:border-[var(--theme-accent)]"
                />
              </div>
              <textarea
                value={deliveryInstructions}
                onChange={(event) => setDeliveryInstructions(event.target.value)}
                placeholder="Instruções de entrega (opcional)"
                rows={3}
                className="w-full rounded-md border border-[var(--theme-border)] px-3 py-2 text-sm outline-none focus:border-[var(--theme-accent)]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void checkout()}
            disabled={checkingOut || cart.items.length === 0}
            className="mt-6 w-full rounded-md bg-[var(--theme-background)] px-5 py-3 text-sm font-semibold text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkingOut ? "A processar..." : "Finalizar compra"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/app/marketplace")}
            disabled={checkingOut}
            className="mt-3 w-full rounded-md border border-[var(--theme-border)] px-5 py-3 text-sm font-medium text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continuar a comprar
          </button>
        </aside>
      </div>
    </main>
  );
}
