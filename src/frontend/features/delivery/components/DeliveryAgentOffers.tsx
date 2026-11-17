"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type TransportMode = "WALK" | "BICYCLE" | "MOTORCYCLE" | "CAR" | "VAN";
type AgentProfile = {
  id: string;
  status: string;
  availability: string;
  transportMode: TransportMode;
  displayName: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  lastLocationAt: string | null;
};
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
const EMPTY_OFFERS: OfferResponse = { offers: [], pagination: { total: 0, limit: 50, offset: 0 } };

function formatDistance(value?: number) {
  if (value === undefined) return "Distância indisponível";
  return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`;
}
function getPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este dispositivo não disponibiliza localização GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (cause) => reject(new Error(
        cause.code === cause.PERMISSION_DENIED
          ? "Permita o acesso à localização GPS para ficar disponível."
          : cause.code === cause.TIMEOUT
            ? "Não foi possível obter GPS a tempo. Tente novamente num local com melhor sinal."
            : "Não foi possível obter a localização GPS."
      )),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  });
}

export default function DeliveryAgentOffers() {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [data, setData] = useState<OfferResponse>(EMPTY_OFFERS);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode>("MOTORCYCLE");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastLocationSentAt = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profileResponse = await fetch("/api/delivery/agent/availability", { cache: "no-store" });
      if (profileResponse.status === 404) {
        setAgent(null);
        setData(EMPTY_OFFERS);
        setProfileLoaded(true);
        setError(null);
        return;
      }
      const profileBody = await profileResponse.json() as { agent?: AgentProfile; message?: string };
      if (!profileResponse.ok || !profileBody.agent) {
        throw new Error(profileBody.message ?? "Não foi possível carregar o perfil de estafeta.");
      }

      setAgent(profileBody.agent);
      setProfileLoaded(true);

      if (profileBody.agent.status !== "ACTIVE") {
        setData(EMPTY_OFFERS);
        setError(null);
        return;
      }

      const response = await fetch("/api/delivery/agent/offers?limit=50", { cache: "no-store" });
      const body = await response.json() as OfferResponse & { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Não foi possível carregar as ofertas.");
      setData(body);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar as ofertas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const agentId = agent?.id;
  const shouldTrackLocation = agent?.status === "ACTIVE" && ["AVAILABLE", "BUSY"].includes(agent.availability);

  useEffect(() => {
    if (!agentId || !shouldTrackLocation || !navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastLocationSentAt.current < 5000) return;
        lastLocationSentAt.current = now;
        void fetch("/api/delivery/agent/location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        }).then(async (response) => {
          if (!response.ok && response.status !== 429) {
            const body = await response.json().catch(() => ({}));
            setError(body.message ?? "Não foi possível actualizar a localização GPS.");
          }
        }).catch(() => setError("Não foi possível actualizar a localização GPS."));
      },
      () => setError("A localização GPS deixou de estar disponível. Verifique as permissões do dispositivo."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [agentId, shouldTrackLocation]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegistrationBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/delivery/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          phone: phone.trim() || undefined,
          transportMode,
        }),
      });
      const body = await response.json() as { agent?: AgentProfile; message?: string; code?: string };
      if (!response.ok) throw new Error(body.message ?? body.code ?? "Não foi possível enviar a candidatura.");
      setNotice("Candidatura enviada. O perfil ficará disponível depois da aprovação da equipa MARKA.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível enviar a candidatura.");
    } finally {
      setRegistrationBusy(false);
    }
  }

  async function updateAvailability() {
    if (!agent || availabilityBusy || agent.status !== "ACTIVE" || agent.availability === "BUSY") return;
    const nextAvailability = agent.availability === "AVAILABLE" ? "OFFLINE" : "AVAILABLE";
    setAvailabilityBusy(true);
    setError(null);
    setNotice(null);
    try {
      let position: GeolocationPosition | null = null;
      if (nextAvailability === "AVAILABLE") {
        position = await getPosition();
      }

      const response = await fetch("/api/delivery/agent/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: nextAvailability }),
      });
      const body = await response.json() as { agent?: AgentProfile; message?: string };
      if (!response.ok) throw new Error(body.message ?? "Não foi possível actualizar a disponibilidade.");
      if (body.agent) setAgent(body.agent);

      if (nextAvailability === "AVAILABLE" && position) {
        const locationResponse = await fetch("/api/delivery/agent/location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        });
        const locationBody = await locationResponse.json().catch(() => ({}));
        if (!locationResponse.ok) {
          const rollback = await fetch("/api/delivery/agent/availability", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ availability: "OFFLINE" }),
          }).catch(() => null);
          if (rollback?.ok) setAgent((current) => current ? { ...current, availability: "OFFLINE" } : current);
          throw new Error(
            (locationBody.message ?? "Não foi possível registar a localização GPS.") +
            (rollback?.ok ? " A disponibilidade foi desactivada." : " Não foi possível confirmar a desactivação; actualize o estado antes de aceitar pedidos.")
          );
        }
        lastLocationSentAt.current = Date.now();
      }

      await load();
      setNotice(nextAvailability === "AVAILABLE"
        ? "Estás disponível. A localização GPS será actualizada enquanto estiveres online."
        : "Ficaste offline. As entregas já atribuídas continuam disponíveis para conclusão.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível actualizar a disponibilidade.");
    } finally {
      setAvailabilityBusy(false);
    }
  }

  async function accept(dispatchId: string) {
    setActionId(dispatchId);
    setError(null);
    try {
      const response = await fetch(`/api/delivery/dispatch/${dispatchId}/accept`, { method: "POST" });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Não foi possível aceitar a entrega.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível aceitar a entrega.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-8 sm:px-9 sm:py-10">
        <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-[color-mix(in_srgb,var(--theme-text)_30%,transparent)]">MARKA / ENTREGAS</p>
        <h1 className="mt-5 marka-editorial text-4xl text-[var(--theme-text)] sm:text-5xl">Ofertas de entrega</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color-mix(in_srgb,var(--theme-text)_40%,transparent)]">Regista-te como estafeta, activa a disponibilidade e recebe pedidos próximos. O aceite é processado pelo motor de distribuição da MARKA.</p>
      </section>

      {notice && <div role="status" className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 py-4 text-xs text-[var(--theme-text)]">{notice}</div>}
      {error && <div role="alert" className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 py-4 text-xs text-[var(--theme-text)]">{error}</div>}

      {profileLoaded && !agent && (
        <form onSubmit={register} className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6">
          <h2 className="text-lg font-medium text-[var(--theme-text)]">Candidatar-me como estafeta</h2>
          <p className="mt-2 text-xs leading-6 text-[color-mix(in_srgb,var(--theme-text)_45%,transparent)]">Usa a tua conta MARKA actual. A equipa irá rever e aprovar o perfil antes de poderes receber entregas.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-[var(--theme-text)]">
              Nome de apresentação
              <input required minLength={2} maxLength={160} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-transparent px-3 text-sm" />
            </label>
            <label className="block text-xs text-[var(--theme-text)]">
              Telefone de contacto (opcional)
              <input maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-transparent px-3 text-sm" />
            </label>
            <label className="block text-xs text-[var(--theme-text)] sm:col-span-2">
              Meio de transporte
              <select value={transportMode} onChange={(event) => setTransportMode(event.target.value as TransportMode)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm">
                <option value="MOTORCYCLE">Motorizada</option>
                <option value="BICYCLE">Bicicleta</option>
                <option value="CAR">Automóvel</option>
                <option value="VAN">Carrinha</option>
                <option value="WALK">A pé</option>
              </select>
            </label>
          </div>
          <button type="submit" disabled={registrationBusy} className="mt-5 min-h-11 rounded-full bg-[#d8c18c] px-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#171814] disabled:opacity-50">
            {registrationBusy ? "A enviar candidatura…" : "Enviar candidatura"}
          </button>
        </form>
      )}

      {agent && (
        <section className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--theme-text)_35%,transparent)]">Perfil do estafeta</p>
              <h2 className="mt-2 text-lg font-medium text-[var(--theme-text)]">{agent.displayName ?? "Estafeta MARKA"}</h2>
              <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--theme-text)_45%,transparent)]">{agent.transportMode} · Estado: {agent.status} · Disponibilidade: {agent.availability}</p>
            </div>
            {agent.status === "ACTIVE" && (
              <button type="button" onClick={() => void updateAvailability()} disabled={availabilityBusy || agent.availability === "BUSY"} className="min-h-11 rounded-full bg-[#d8c18c] px-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#171814] disabled:opacity-50">
                {availabilityBusy ? "A actualizar…" : agent.availability === "AVAILABLE" ? "Ficar offline" : agent.availability === "BUSY" ? "A concluir entregas" : "Ficar disponível"}
              </button>
            )}
          </div>
          {agent.status === "PENDING" && <p className="mt-4 rounded-xl border border-[var(--theme-border)] p-4 text-xs leading-6 text-[color-mix(in_srgb,var(--theme-text)_55%,transparent)]">A tua candidatura foi recebida e aguarda aprovação. Poderás activar a localização e receber pedidos depois da validação.</p>}
          {agent.status === "ACTIVE" && agent.availability === "BUSY" && <p className="mt-4 rounded-xl border border-[var(--theme-border)] p-4 text-xs leading-6 text-[color-mix(in_srgb,var(--theme-text)_55%,transparent)]">Tens entregas atribuídas. Conclui-as antes de ficares offline. Podes continuar a receber e acompanhar as entregas já aceites.</p>}
          {agent.status !== "PENDING" && agent.status !== "ACTIVE" && <p className="mt-4 rounded-xl border border-[var(--theme-border)] p-4 text-xs leading-6 text-[color-mix(in_srgb,var(--theme-text)_55%,transparent)]">O teu perfil não está activo. Contacta a equipa MARKA para obter esclarecimentos.</p>}
          {agent.status === "ACTIVE" && <div className="mt-4 flex flex-wrap gap-3">
            <a href="/app/delivery-agent/deliveries" className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-text)]">As minhas entregas</a>
          </div>}
        </section>
      )}

      {agent?.status === "ACTIVE" && (
        <section className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-[var(--theme-text)]">Pedidos disponíveis</h2>
            <button type="button" onClick={() => void load()} disabled={loading} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-text)] disabled:opacity-50">Actualizar</button>
          </div>
          {loading && <div className="px-6 py-12 text-center text-xs text-[color-mix(in_srgb,var(--theme-text)_45%,transparent)]">A carregar pedidos…</div>}
          {!loading && data.offers.length === 0 && <div className="py-10 text-center text-xs text-[color-mix(in_srgb,var(--theme-text)_35%,transparent)]">Não existem ofertas disponíveis neste momento.</div>}
          {!loading && data.offers.map((offer) => (
            <article key={offer.dispatchId} className="mb-3 mt-4 rounded-2xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-background)_15%,transparent)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--theme-text)_35%,transparent)]">{offer.store?.name ?? "Loja"}</p>
                  <h3 className="mt-2 text-sm font-medium text-[var(--theme-text)]">Encomenda {offer.orderId.slice(0, 8)}</h3>
                  <p className="mt-2 text-xs text-[color-mix(in_srgb,var(--theme-text)_45%,transparent)]">{formatDistance(offer.distanceMeters)}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-lg font-medium text-[var(--theme-text)]">{offer.order.total} {offer.order.currency}</p>
                  <button type="button" onClick={() => void accept(offer.dispatchId)} disabled={actionId !== null || agent.availability !== "AVAILABLE"} className="mt-3 rounded-full border border-[var(--theme-border)] bg-[var(--theme-text)]/[0.04] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text)] disabled:opacity-40">
                    {actionId === offer.dispatchId ? "A aceitar…" : "Aceitar entrega"}
                  </button>
                </div>
              </div>
              {offer.destination?.address && <p className="mt-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-xs leading-5 text-[color-mix(in_srgb,var(--theme-text)_45%,transparent)]">{offer.destination.address}</p>}
            </article>
          ))}
        </section>
      )}
      {loading && !profileLoaded && <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-12 text-center text-xs text-[color-mix(in_srgb,var(--theme-text)_45%,transparent)]">A carregar o perfil…</div>}
    </div>
  );
}
