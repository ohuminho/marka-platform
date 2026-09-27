"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Scope = "ACTIVE" | "HISTORY";

type Delivery = {
  dispatchId: string;
  fulfillmentId: string;
  orderId: string;
  dispatchStatus: string;
  fulfillmentStatus: string;
  exceptionCode?: string;
  acceptedAt: string;
  updatedAt: string;
  order: {
    status: string;
    total: string;
    currency: string;
    deliveryAddress?: string;
    deliveryInstructions?: string;
  };
  store?: {
    id: string;
    name: string;
  };
};

type ResponseData = {
  deliveries: Delivery[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    scope: string;
  };
};

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function Status({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/55">
      {label(value)}
    </span>
  );
}

export default function DeliveryAgentDeliveries() {
  const [scope, setScope] = useState<Scope>("ACTIVE");
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/delivery/agent/deliveries?scope=${scope}&limit=50`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as ResponseData & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(body.message ?? "Unable to load deliveries.");
      }

      setData(body);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load deliveries.",
      );
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const items = data?.deliveries ?? [];
    return {
      total: data?.pagination.total ?? 0,
      exceptions: items.filter((item) => item.exceptionCode).length,
      completed: items.filter(
        (item) => item.fulfillmentStatus === "COMPLETED",
      ).length,
    };
  }, [data]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] px-6 py-8 shadow-[0_30px_100px_rgba(0,0,0,0.25)] sm:px-9 sm:py-10 lg:px-12">
        <div className="absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-white/[0.035] blur-[110px]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-white/30">
              Delivery Operations
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
              My Deliveries
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40">
              Entregas atribuídas a este agente, com estado operacional e contexto do pedido.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50 transition hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-xs text-white/55">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-[9px] uppercase tracking-[0.25em] text-white/25">Total</p>
          <p className="mt-3 text-3xl font-medium text-white/90">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-[9px] uppercase tracking-[0.25em] text-white/25">Visible exceptions</p>
          <p className="mt-3 text-3xl font-medium text-white/90">{summary.exceptions}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-[9px] uppercase tracking-[0.25em] text-white/25">Completed shown</p>
          <p className="mt-3 text-3xl font-medium text-white/90">{summary.completed}</p>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {(["ACTIVE", "HISTORY"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={`rounded-full border px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] transition ${
                scope === value
                  ? "border-white/20 bg-white text-black"
                  : "border-white/10 bg-white/[0.035] text-white/45 hover:text-white"
              }`}
            >
              {value === "ACTIVE" ? "Active" : "History"}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {loading && (
            <div className="rounded-xl border border-white/[0.05] bg-black/15 px-4 py-8 text-center text-xs text-white/25">
              Loading deliveries...
            </div>
          )}

          {!loading && data?.deliveries.length === 0 && (
            <div className="rounded-xl border border-white/[0.05] bg-black/15 px-4 py-10 text-center text-xs text-white/25">
              {scope === "ACTIVE"
                ? "No active deliveries assigned."
                : "No delivery history available."}
            </div>
          )}

          {!loading &&
            data?.deliveries.map((delivery) => (
              <article
                key={delivery.dispatchId}
                className="rounded-2xl border border-white/[0.06] bg-black/15 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Status value={delivery.fulfillmentStatus} />
                      <Status value={delivery.dispatchStatus} />
                      {delivery.exceptionCode && (
                        <Status value={delivery.exceptionCode} />
                      )}
                    </div>
                    <h2 className="mt-3 text-sm font-medium text-white/75">
                      {delivery.store?.name ?? "Store"} · Order {delivery.orderId.slice(0, 8)}
                    </h2>
                    <p className="mt-1 text-[10px] text-white/25">
                      Accepted {formatDate(delivery.acceptedAt)} · Updated {formatDate(delivery.updatedAt)}
                    </p>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-lg font-medium text-white/80">
                      {delivery.order.total} {delivery.order.currency}
                    </p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/20">
                      Order {label(delivery.order.status)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/20">Destination</p>
                    <p className="mt-2 text-xs leading-5 text-white/55">
                      {delivery.order.deliveryAddress ?? "Address unavailable"}
                    </p>
                    {delivery.order.deliveryInstructions && (
                      <p className="mt-2 text-[10px] text-white/25">
                        {delivery.order.deliveryInstructions}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/20">References</p>
                    <p className="mt-2 text-[10px] text-white/30">Dispatch: {delivery.dispatchId}</p>
                    <p className="mt-1 text-[10px] text-white/30">Fulfillment: {delivery.fulfillmentId}</p>
                  </div>
                </div>
              </article>
            ))}
        </div>
      </section>
    </div>
  );
}
