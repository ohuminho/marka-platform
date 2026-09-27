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
      <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] px-6 py-8 sm:px-9 sm:py-10">
        <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-white/30">Delivery Operations</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">Available Deliveries</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40">Ofertas disponíveis para este agente. O aceite é processado pelo dispatch engine.</p>
      </section>

      {error && <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-xs text-white/55">{error}</div>}

      <section className="rounded-[1.75rem] border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
        {loading && <div className="py-10 text-center text-xs text-white/25">Loading offers...</div>}
        {!loading && data?.offers.length === 0 && <div className="py-10 text-center text-xs text-white/25">No delivery offers available.</div>}
        {!loading && data?.offers.map((offer) => (
          <article key={offer.dispatchId} className="mb-3 rounded-2xl border border-white/[0.06] bg-black/15 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">{offer.store?.name ?? "Store"}</p>
                <h2 className="mt-2 text-sm font-medium text-white/75">Order {offer.orderId.slice(0, 8)}</h2>
                <p className="mt-2 text-xs text-white/40">{formatDistance(offer.distanceMeters)}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-medium text-white/80">{offer.order.total} {offer.order.currency}</p>
                <button type="button" onClick={() => void accept(offer.dispatchId)} disabled={actionId !== null} className="mt-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/55 transition hover:border-white/20 hover:text-white disabled:opacity-40">
                  {actionId === offer.dispatchId ? "Accepting..." : "Accept delivery"}
                </button>
              </div>
            </div>
            {offer.destination?.address && <p className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-xs leading-5 text-white/45">{offer.destination.address}</p>}
          </article>
        ))}
      </section>
    </div>
  );
}
