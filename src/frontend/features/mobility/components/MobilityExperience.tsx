"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";
import MobilityLiveMap from "@/frontend/features/mobility/components/MobilityLiveMap";

type MapPoint = { lat: number; lon: number; label: string };
type RideResult = {
  ride?: { id: string; reference?: string | null; status?: string; serviceType?: string };
  orchestration?: { currentStep?: string | null; status?: string | null; recoveryRequired?: boolean };
  message?: string;
};

const services = [
  { id: "TAXI", name: "MARKA Go", subtitle: "Táxi", description: "Conforto para deslocações urbanas e interurbanas.", capacity: "Até 4 passageiros", icon: "car" },
  { id: "MOTO_TAXI", name: "MARKA Moto", subtitle: "Mototáxi", description: "Uma opção ágil para percursos individuais.", capacity: "1 passageiro", icon: "bike" },
] as const;

const statusLabels: Record<string, string> = {
  REQUESTED: "Pedido recebido",
  SAFETY_READY: "Verificação de segurança",
  SEARCHING: "À procura de motorista",
  DRIVER_ASSIGNED: "Motorista atribuído",
  DRIVER_ACCEPTED: "Motorista confirmou",
  DRIVER_ARRIVING: "Motorista a caminho",
  DRIVER_ARRIVED: "Motorista chegou",
  TRIP_STARTED: "Viagem iniciada",
  TRIP_IN_PROGRESS: "Em viagem",
};

function ServiceIcon({ kind }: { kind: "car" | "bike" }) {
  return kind === "car" ? (
    <svg viewBox="0 0 48 32" aria-hidden="true" className="h-9 w-12" fill="none">
      <path d="m5 21 3-2 5-10c1-2 3-3 5-3h13c3 0 5 1 7 4l5 9 2 2v5H3v-3c0-1 1-2 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="m14 10-3 8h27l-4-8c-1-2-3-3-5-3H19c-2 0-4 1-5 3Z" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.4"/>
      <circle cx="12" cy="25" r="3.5" fill="#090B10" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="37" cy="25" r="3.5" fill="#090B10" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ) : (
    <svg viewBox="0 0 48 32" aria-hidden="true" className="h-9 w-12" fill="none">
      <circle cx="9" cy="24" r="5" stroke="currentColor" strokeWidth="1.7"/>
      <circle cx="39" cy="24" r="5" stroke="currentColor" strokeWidth="1.7"/>
      <path d="m9 24 9-11h10l11 11H27l-9-11m10 0 4-6h6m-20 6-3-5H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 10h9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function MobilityExperience() {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.id;
  const [origin, setOrigin] = useState<MapPoint | null>(null);
  const [destination, setDestination] = useState<MapPoint | null>(null);
  const [serviceType, setServiceType] = useState<string>("TAXI");
  const [passengerCount, setPassengerCount] = useState(1);
  const [safetyMode, setSafetyMode] = useState<"STANDARD" | "TRUSTED" | "CHILD">("STANDARD");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rideResult, setRideResult] = useState<RideResult | null>(null);
  const [requestReference, setRequestReference] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceType) ?? services[0],
    [serviceType],
  );
  const pointsReady = Boolean(origin && destination);

  const onPointsChange = (points: { origin: MapPoint | null; destination: MapPoint | null }) => {
    setOrigin(points.origin);
    setDestination(points.destination);
    setError(null);
    setRideResult(null);
  };

  async function submitRide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!organizationId) {
      setError("Não existe uma organização ativa nesta sessão. Atualize a sessão antes de pedir a viagem.");
      return;
    }
    if (!origin || !destination) {
      setError("Defina a partida por GPS e selecione um destino no mapa.");
      return;
    }
    if (origin.lat === destination.lat && origin.lon === destination.lon) {
      setError("A partida e o destino não podem ser o mesmo ponto.");
      return;
    }

    setCreating(true);
    const requestPayload = {
      serviceType,
      passengerCount: serviceType === "MOTO_TAXI" ? 1 : passengerCount,
      currency: "AOA",
      pickupLatitude: origin.lat,
      pickupLongitude: origin.lon,
      pickupAddress: origin.label,
      dropoffLatitude: destination.lat,
      dropoffLongitude: destination.lon,
      dropoffAddress: destination.label,
      safetyMode,
      metadata: { requestSource: "MARKA_MOBILITY_RIDER_WEB" },
    };
    const requestFingerprint = JSON.stringify(requestPayload);
    const storageKey = `marka:mobility:pending-ride:${organizationId}`;
    let idempotencyKey = "";
    try {
      const pendingRaw = window.sessionStorage.getItem(storageKey);
      const pending = pendingRaw ? JSON.parse(pendingRaw) as { key?: string; fingerprint?: string } : null;
      idempotencyKey = pending?.fingerprint === requestFingerprint && typeof pending.key === "string"
        ? pending.key
        : `marka-ride-${crypto.randomUUID()}`;
      window.sessionStorage.setItem(storageKey, JSON.stringify({ key: idempotencyKey, fingerprint: requestFingerprint }));
    } catch {
      idempotencyKey = `marka-ride-${crypto.randomUUID()}`;
    }

    try {
      const response = await fetch("/api/mobility/rides", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey, "X-Organization-Id": organizationId },
        body: JSON.stringify(requestPayload),
      });
      const data = (await response.json()) as RideResult;
      if (!response.ok) throw new Error(data.message || "Não foi possível registar o pedido. Verifique a ligação e tente novamente.");
      setRideResult(data);
      setRequestReference(data.ride?.reference ?? data.ride?.id ?? "Pedido registado");
      try {
        const pendingRaw = window.sessionStorage.getItem(storageKey);
        const pending = pendingRaw ? JSON.parse(pendingRaw) as { key?: string } : null;
        if (pending?.key === idempotencyKey && !data.orchestration?.recoveryRequired) window.sessionStorage.removeItem(storageKey);
      } catch {
        // O servidor mantém a autoridade sobre a operação; o armazenamento local só apoia retries.
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "O pedido não foi concluído. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  const currentStep = rideResult?.orchestration?.currentStep ?? rideResult?.ride?.status ?? "";
  const currentStatus = statusLabels[currentStep] ?? (currentStep ? currentStep.replaceAll("_", " ").toLowerCase() : "Pedido em processamento");

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/[.09] bg-[#080A0E] text-white shadow-[0_30px_100px_-55px_rgba(0,0,0,.9)]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.08] px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9AA4B]/25 bg-[#D9AA4B]/[.07] text-[#E9BD58]">
            <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden="true"><path d="M4 21 8 17 12 7h9l5 10 3 3v5H3v-2c0-1 0-2 1-2Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="9" cy="25" r="2.5" fill="#080A0E" stroke="currentColor"/><circle cx="23" cy="25" r="2.5" fill="#080A0E" stroke="currentColor"/></svg>
          </div>
          <div><p className="text-[10px] font-bold tracking-[.24em] text-white">MARKA <span className="text-[#E9BD58]">MOBILITY</span></p><p className="mt-0.5 text-[10px] text-white/40">A cidade, ao seu ritmo.</p></div>
        </div>
        <Link href="/app/driver" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-semibold text-white/75 transition hover:border-[#E9BD58]/50 hover:text-[#F2CD70]">
          Área de motorista <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.8fr)]">
        <div className="min-w-0 border-b border-white/[.08] lg:border-b-0 lg:border-r">
          <div className="flex items-end justify-between gap-3 px-5 pb-4 pt-6 sm:px-7">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#E9BD58]">Mobilidade urbana</p><h1 className="mt-2 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Para onde vamos?</h1><p className="mt-1 text-xs text-white/45">Escolha a partida e o destino. O resto é simples.</p></div>
            <span className="hidden rounded-full border border-white/10 px-3 py-1.5 text-[9px] text-white/45 sm:inline-flex">ANGOLA</span>
          </div>
          <div className="px-3 pb-5 sm:px-5 sm:pb-7">
            <MobilityLiveMap onPointsChange={onPointsChange} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-xl border border-white/[.08] bg-white/[.025] px-3 py-3">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#80C8A0]" /><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-white/40">Partida</p></div>
                <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-white/85">{origin?.label ?? "A aguardar localização"}</p>
              </div>
              <div className="min-w-0 rounded-xl border border-white/[.08] bg-white/[.025] px-3 py-3">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#E9BD58]" /><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-white/40">Destino</p></div>
                <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-white/85">{destination?.label ?? "A escolher no mapa"}</p>
              </div>
            </div>
            <p className="mt-3 px-1 text-[10px] leading-4 text-white/30">A localização só é obtida após autorização explícita. O mapa e as rotas usam serviços públicos OpenStreetMap.</p>
          </div>
        </div>

        <form onSubmit={submitRide} className="flex min-w-0 flex-col p-5 sm:p-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#E9BD58]">O seu serviço</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Escolha como viajar.</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {services.map((service) => {
                const selected = serviceType === service.id;
                return (
                  <button key={service.id} type="button" aria-pressed={selected} onClick={() => { setServiceType(service.id); if (service.id === "MOTO_TAXI") setPassengerCount(1); }} className={`group min-w-0 rounded-2xl border p-3 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#E9BD58] ${selected ? "border-[#E9BD58]/70 bg-[#E9BD58]/[.09] shadow-[inset_0_0_0_1px_rgba(233,189,88,.12)]" : "border-white/10 bg-white/[.025] hover:border-white/25"}`}>
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-[#E9BD58]/10 text-[#F2CD70]" : "bg-white/[.04] text-white/55"}`}><ServiceIcon kind={service.icon} /></div>
                    <p className="text-sm font-semibold">{service.name}</p>
                    <p className={`mt-1 text-[10px] font-medium ${selected ? "text-[#F2CD70]" : "text-white/45"}`}>{service.subtitle}</p>
                    <p className="mt-3 text-[10px] leading-4 text-white/40">{service.capacity}</p>
                    <span className={`mt-3 inline-flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-[#E9BD58] bg-[#E9BD58] text-[#111]" : "border-white/25"}`}>{selected && <span className="text-[10px] font-bold">✓</span>}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-5 text-white/45">{selectedService.description}</p>
          </div>

          <div className="mt-6 space-y-4 border-t border-white/[.08] pt-5">
            {serviceType === "TAXI" && (
              <label className="block"><span className="text-xs font-semibold text-white/75">Passageiros</span><select value={passengerCount} onChange={(event) => setPassengerCount(Math.max(1, Math.min(4, Number(event.target.value) || 1)))} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#11151B] px-3 text-sm text-white outline-none focus:border-[#E9BD58]">{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} {count === 1 ? "passageiro" : "passageiros"}</option>)}</select></label>
            )}
            <label className="block"><span className="text-xs font-semibold text-white/75">Proteção da viagem</span><select value={safetyMode} onChange={(event) => setSafetyMode(event.target.value as typeof safetyMode)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#11151B] px-3 text-sm text-white outline-none focus:border-[#E9BD58]"><option value="STANDARD">Padrão</option><option value="TRUSTED">Contacto de confiança</option><option value="CHILD">Menor / proteção reforçada</option></select><span className="mt-1.5 block text-[10px] leading-4 text-white/35">Aplicam-se as regras de elegibilidade e segurança da MARKA.</span></label>
          </div>

          <div className="mt-6 rounded-xl border border-white/[.08] bg-white/[.025] p-3">
            <div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[.15em] text-white/40">Percurso</span><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${pointsReady ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[.05] text-white/40"}`}>{pointsReady ? "Definido" : "Incompleto"}</span></div>
            <p className="mt-2 text-xs text-white/70">{origin && destination ? "Partida e destino prontos para validação." : "Defina os dois pontos no mapa para continuar."}</p>
          </div>

          {error && <div role="alert" className="mt-4 rounded-xl border border-rose-400/25 bg-rose-400/[.06] p-3 text-xs leading-5 text-rose-100">{error}</div>}
          <div className="mt-auto pt-5">
            <button type="submit" disabled={!pointsReady || creating} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F5D47C] to-[#DCA83D] px-4 py-3 text-sm font-bold text-[#17130A] shadow-[0_10px_30px_-15px_rgba(233,189,88,.55)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-35">
              {creating ? "A confirmar pedido…" : "Confirmar viagem"} <span aria-hidden="true">→</span>
            </button>
            <p className="mt-3 text-center text-[10px] leading-4 text-white/35">Sem cobrança nesta etapa. A atribuição depende de um motorista e veículo elegíveis.</p>
          </div>

          {rideResult?.ride && (
            <div role="status" aria-live="polite" className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[.05] p-4">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /><p className="text-xs font-semibold text-emerald-200">Pedido registado</p></div>
              <p className="mt-3 text-[9px] uppercase tracking-[.18em] text-white/40">Referência</p><p className="mt-1 break-all text-sm font-semibold">{requestReference}</p>
              <p className="mt-3 text-xs text-white/70">Estado: {currentStatus}</p>
              {rideResult.orchestration?.recoveryRequired && <p className="mt-2 text-[10px] leading-4 text-amber-200">O sistema está a recuperar uma etapa operacional. Consulte o estado antes de criar outro pedido.</p>}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
