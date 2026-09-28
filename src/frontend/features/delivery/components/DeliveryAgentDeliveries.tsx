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

type TransitionStatus = "PREPARING" | "READY_FOR_PICKUP" | "PICKED_UP" | "IN_TRANSIT" | "COMPLETED" | "EXCEPTION";

function nextActions(status: string): Array<{ status: TransitionStatus; label: string }> {
  switch (status) {
    case "ASSIGNED": return [{ status: "PREPARING", label: "Start preparing" }];
    case "PREPARING": return [{ status: "READY_FOR_PICKUP", label: "Ready for pickup" }];
    case "READY_FOR_PICKUP": return [{ status: "PICKED_UP", label: "Picked up" }];
    case "PICKED_UP": return [{ status: "IN_TRANSIT", label: "Start delivery" }];
    case "IN_TRANSIT": return [{ status: "COMPLETED", label: "Complete delivery" }, { status: "EXCEPTION", label: "Report exception" }];
    case "EXCEPTION": return [{ status: "IN_TRANSIT", label: "Resume delivery" }];
    default: return [];
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function Status({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-text)]/55">
      {label(value)}
    </span>
  );
}

export default function DeliveryAgentDeliveries() {
  const [scope, setScope] = useState<Scope>("ACTIVE");
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
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
    const initialLoadTimer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(initialLoadTimer);
    };
  }, [load]);

  const transition = useCallback(
    async (delivery: Delivery, status: TransitionStatus) => {
      let reason: string | undefined;
      if (status === "EXCEPTION") {
        reason = window.prompt("Describe the delivery exception:")?.trim();
        if (!reason) return;
      }
      setActionId(delivery.dispatchId);
      setError(null);
      try {
        const response = await fetch(`/api/delivery/dispatch/${delivery.dispatchId}/transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reason }),
        });
        const body = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(body.message ?? "Unable to transition delivery.");
        await load();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to transition delivery.");
      } finally {
        setActionId(null);
      }
    },
    [load],
  );

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
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.025] px-6 py-8 shadow-[0_30px_100px_rgba(0,0,0,0.25)] sm:px-9 sm:py-10 lg:px-12">
        <div className="absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-[var(--theme-surface-strong)]/[0.035] blur-[110px]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-[var(--theme-text)]/30">
              Delivery Operations
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-[var(--theme-text)] sm:text-5xl">
              My Deliveries
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--theme-text)]/40">
              Entregas atribuídas a este agente, com estado operacional e contexto do pedido.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-text)]/50 transition hover:border-[var(--theme-border)] hover:text-[var(--theme-text)] disabled:opacity-40"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] px-5 py-4 text-xs text-[var(--theme-text)]/55">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-[var(--theme-surface-strong)]/[0.025] p-5">
          <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--theme-text)]/25">Total</p>
          <p className="mt-3 text-3xl font-medium text-[var(--theme-text)]/90">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[var(--theme-surface-strong)]/[0.025] p-5">
          <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--theme-text)]/25">Visible exceptions</p>
          <p className="mt-3 text-3xl font-medium text-[var(--theme-text)]/90">{summary.exceptions}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[var(--theme-surface-strong)]/[0.025] p-5">
          <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--theme-text)]/25">Completed shown</p>
          <p className="mt-3 text-3xl font-medium text-[var(--theme-text)]/90">{summary.completed}</p>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/[0.07] bg-[var(--theme-surface-strong)]/[0.02] p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {(["ACTIVE", "HISTORY"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={`rounded-full border px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] transition ${
                scope === value
                  ? "border-[var(--theme-border)] bg-[var(--theme-surface-strong)] text-[var(--theme-background)]"
                  : "border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] text-[var(--theme-text)]/45 hover:text-[var(--theme-text)]"
              }`}
            >
              {value === "ACTIVE" ? "Active" : "History"}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {loading && (
            <div className="rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-background)_15%,transparent)] px-4 py-8 text-center text-xs text-[var(--theme-text)]/25">
              Loading deliveries...
            </div>
          )}

          {!loading && data?.deliveries.length === 0 && (
            <div className="rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-background)_15%,transparent)] px-4 py-10 text-center text-xs text-[var(--theme-text)]/25">
              {scope === "ACTIVE"
                ? "No active deliveries assigned."
                : "No delivery history available."}
            </div>
          )}

          {!loading &&
            data?.deliveries.map((delivery) => {
              const actions = scope === "ACTIVE" ? nextActions(delivery.fulfillmentStatus) : [];

              return (
              <article
                key={delivery.dispatchId}
                className="rounded-2xl border border-white/[0.06] bg-[color-mix(in_srgb,var(--theme-background)_15%,transparent)] p-5"
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
                    <h2 className="mt-3 text-sm font-medium text-[var(--theme-text)]/75">
                      {delivery.store?.name ?? "Store"} · Order {delivery.orderId.slice(0, 8)}
                    </h2>
                    <p className="mt-1 text-[10px] text-[var(--theme-text)]/25">
                      Accepted {formatDate(delivery.acceptedAt)} · Updated {formatDate(delivery.updatedAt)}
                    </p>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-lg font-medium text-[var(--theme-text)]/80">
                      {delivery.order.total} {delivery.order.currency}
                    </p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-[var(--theme-text)]/20">
                      Order {label(delivery.order.status)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.02] p-4">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text)]/20">Destination</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--theme-text)]/55">
                      {delivery.order.deliveryAddress ?? "Address unavailable"}
                    </p>
                    {delivery.order.deliveryInstructions && (
                      <p className="mt-2 text-[10px] text-[var(--theme-text)]/25">
                        {delivery.order.deliveryInstructions}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.02] p-4">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text)]/20">References</p>
                    <p className="mt-2 text-[10px] text-[var(--theme-text)]/30">Dispatch: {delivery.dispatchId}</p>
                    <p className="mt-1 text-[10px] text-[var(--theme-text)]/30">Fulfillment: {delivery.fulfillmentId}</p>
                  </div>
                </div>
                {actions.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--theme-border)] pt-4">
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        onClick={() => void transition(delivery, action.status)}
                        disabled={actionId !== null}
                        className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.04] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text)]/55 transition hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface-strong)]/[0.07] hover:text-[var(--theme-text)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {actionId === delivery.dispatchId ? "Processing..." : action.label}
                      </button>
                    ))}
                  </div>
                )}
              </article>
              );
            })}
        </div>
      </section>
    </div>
  );
}
