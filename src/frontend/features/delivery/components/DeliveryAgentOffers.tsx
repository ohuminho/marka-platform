"use client";

import { useCallback, useEffect, useState } from "react";

type Offer = {
  dispatchId: string;
  orderId: string;
  distanceMeters?: number;
  createdAt: string;
  store?: { id: string; name: string };
  pickup: { latitude: number; longitude: number };
  destination?: { latitude: number; longitude: number; address?: string };
  order: { total: string; currency: string };
};

type OfferResponse = { offers: Offer[]; pagination: { total: number; limit: number; offset: number } };

function formatDistance(value?: number) {
  if (value === undefined) return "Distance unavailable";
  return value < 1000 ? `${Math.round(value)} m away` : `${(value / 1000).toFixed(1)} km away`;
}

export default function DeliveryAgentOffers() {
  const [data, setData] = useState<OfferResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/delivery/agent/offers?limit=50", { cache: "no-store" });
      const body = (await response.json()) as OfferResponse & { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Unable to load offers.");
      setData(body);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load offers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function accept(dispatchId: string) {
    setActionId(dispatchId);
    setError(null);
    try {
      const response = await fetch(`/api/delivery/dispatch/${dispatchId}/accept`, { method: "POST" });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Unable to accept delivery.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to accept delivery.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-8 sm:px-9 sm:py-10">
        <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-[color-mix(in_srgb,var(--theme-text)_30%,transparent)]">Delivery Operations</p>
        <h1 className="mt-5 marka-editorial text-4xl text-[var(--theme-text)] sm:text-5xl">Available Deliveries</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color-mix(in_srgb,var(--theme-text)_40%,transparent)]">Ofertas disponíveis para este agente. O aceite é processado pelo dispatch engine.</p>
      </section>

      {error && <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 py-4 text-xs text-[color-mix(in_srgb,var(--theme-text)_55%,transparent)]">{error}</div>}

      <section className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6">
        {loading && <div className="rounded-[1.25rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-12 text-center text-xs text-[color-mix(in_srgb,var(--theme-text)_45%,transparent)]">Loading offers...</div>}
        {!loading && data?.offers.length === 0 && <div className="py-10 text-center text-xs text-[color-mix(in_srgb,var(--theme-text)_25%,transparent)]">No delivery offers available.</div>}
        {!loading && data?.offers.map((offer) => (
          <article key={offer.dispatchId} className="mb-3 rounded-2xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-background)_15%,transparent)] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--theme-text)_25%,transparent)]">{offer.store?.name ?? "Store"}</p>
                <h2 className="mt-2 text-sm font-medium text-[color-mix(in_srgb,var(--theme-text)_75%,transparent)]">Order {offer.orderId.slice(0, 8)}</h2>
                <p className="mt-2 text-xs text-[color-mix(in_srgb,var(--theme-text)_40%,transparent)]">{formatDistance(offer.distanceMeters)}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-medium text-[color-mix(in_srgb,var(--theme-text)_80%,transparent)]">{offer.order.total} {offer.order.currency}</p>
                <button type="button" onClick={() => void accept(offer.dispatchId)} disabled={actionId !== null} className="mt-3 rounded-full border border-[var(--theme-border)] bg-[var(--theme-text)]/[0.04] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--theme-text)_55%,transparent)] transition hover:border-white/20 hover:text-[var(--theme-text)] disabled:opacity-40">
                  {actionId === offer.dispatchId ? "Accepting..." : "Accept delivery"}
                </button>
              </div>
            </div>
            {offer.destination?.address && <p className="mt-4 rounded-xl border border-white/[0.05] bg-[var(--theme-surface)] p-4 text-xs leading-5 text-[color-mix(in_srgb,var(--theme-text)_45%,transparent)]">{offer.destination.address}</p>}
          </article>
        ))}
      </section>
    </div>
  );
}
