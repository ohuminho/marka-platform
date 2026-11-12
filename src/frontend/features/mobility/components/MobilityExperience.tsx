"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";
import MobilityLiveMap from "@/frontend/features/mobility/components/MobilityLiveMap";
import MarkaVehicleIllustration from "@/frontend/features/mobility/components/MarkaVehicleIllustration";

type MapPoint = { lat: number; lon: number; label: string };
type RideResult = {
  ride?: { id: string; reference?: string | null; status?: string; serviceType?: string };
  orchestration?: { currentStep?: string | null; status?: string | null; recoveryRequired?: boolean };
  message?: string;
};

const services = [
  { id: "TAXI", name: "MARKA Go", subtitle: "Táxi", description: "Conforto para deslocações urbanas e interurbanas.", capacity: "Até 4 passageiros", icon: "sedan" },
  { id: "EXECUTIVE", name: "MARKA Executive", subtitle: "Executivo", description: "Serviço premium para deslocações com maior exigência de conforto.", capacity: "Até 4 passageiros · viatura de classe executiva", icon: "phantom" },
  { id: "MOTO_TAXI", name: "MARKA Moto", subtitle: "Mototáxi", description: "Uma opção ágil para percursos individuais.", capacity: "1 passageiro", icon: "motorcycle" },
  { id: "VAN", name: "MARKA Van", subtitle: "Carrinha", description: "Transporte para grupos e deslocações com maior espaço.", capacity: "Capacidade conforme a viatura", icon: "van" },
  { id: "MINIBUS", name: "MARKA Mini", subtitle: "Minibus", description: "Transporte coletivo em percursos urbanos e interurbanos.", capacity: "Capacidade conforme a viatura", icon: "minibus" },
  { id: "BUS", name: "MARKA Bus", subtitle: "Autocarro", description: "Transporte de grupos em maior escala.", capacity: "Capacidade conforme a viatura", icon: "bus" },
  { id: "COACH", name: "MARKA Coach", subtitle: "Coach", description: "Viagens de grupo e percursos de longa distância.", capacity: "Capacidade conforme a viatura", icon: "coach" },
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
    <section className="relative isolate overflow-hidden rounded-[30px] border border-white/[.09] bg-[#080B10] text-white shadow-[0_36px_110px_-48px_rgba(0,0,0,.95)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,rgba(233,189,88,.13),transparent_68%)]" />
      <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/[.07] px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E9BD58]/25 bg-[#E9BD58]/[.08] text-[#F2CD70] shadow-[0_0_32px_-16px_rgba(233,189,88,.8)]">
            <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden="true"><path d="M4 21 8 17 12 7h9l5 10 3 3v5H3v-2c0-1 0-2 1-2Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="9" cy="25" r="2.5" fill="#080A0E" stroke="currentColor"/><circle cx="23" cy="25" r="2.5" fill="#080A0E" stroke="currentColor"/></svg>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[.25em] text-white">MARKA <span className="text-[#E9BD58]">MOBILITY</span></p>
            <p className="mt-1 text-[11px] text-white/45">Movimento inteligente. Chegadas tranquilas.</p>
          </div>
        </div>
        <Link href="/app/driver" className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-white/[.12] bg-white/[.035] px-4 text-[11px] font-semibold text-white/70 transition hover:border-[#E9BD58]/45 hover:bg-[#E9BD58]/[.06] hover:text-[#F2CD70]">
          Conduzir com a MARKA <span className="transition-transform group-hover:translate-x-0.5">↗</span>
        </Link>
      </header>

      <div className="relative grid lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,.8fr)]">
        <div className="min-w-0 border-b border-white/[.07] lg:border-b-0 lg:border-r lg:border-white/[.07]">
          <div className="flex items-end justify-between gap-3 px-5 pb-4 pt-6 sm:px-7">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.25em] text-[#E9BD58]">A sua próxima viagem começa aqui</p>
              <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.7rem)] font-semibold leading-[1.04] tracking-[-.055em]">A cidade está<br className="hidden sm:block"/> mais perto.</h1>
              <p className="mt-2 max-w-md text-xs leading-5 text-white/45">Defina o ponto de partida, escolha o destino e acompanhe cada etapa com clareza.</p>
            </div>
            <div className="hidden shrink-0 items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.045] px-3 py-2 sm:inline-flex">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-30"/><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300"/></span>
              <span className="text-[9px] font-semibold tracking-wide text-emerald-100/75">MAPA INTERATIVO</span>
            </div>
          </div>
          <div className="px-3 pb-4 sm:px-5 sm:pb-6">
            <MobilityLiveMap onPointsChange={onPointsChange} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-2xl border border-white/[.08] bg-white/[.025] px-3.5 py-3">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#80C8A0] shadow-[0_0_12px_rgba(128,200,160,.5)]"/><p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/40">Ponto de partida</p></div>
                <p className="mt-2 line-clamp-2 break-words text-[11px] leading-5 text-white/85">{origin?.label ?? "A sua localização, via GPS"}</p>
              </div>
              <div className="min-w-0 rounded-2xl border border-white/[.08] bg-white/[.025] px-3.5 py-3">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#E9BD58] shadow-[0_0_12px_rgba(233,189,88,.5)]"/><p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/40">Destino</p></div>
                <p className="mt-2 line-clamp-2 break-words text-[11px] leading-5 text-white/85">{destination?.label ?? "Onde pretende chegar?"}</p>
              </div>
            </div>
            <p className="mt-3 px-1 text-[9px] leading-4 text-white/30">A localização é solicitada apenas com a sua autorização. Cartografia e cálculo de percurso através de serviços OpenStreetMap.</p>
          </div>
        </div>

        <form onSubmit={submitRide} className="relative z-10 -mt-7 flex min-w-0 flex-col rounded-t-[28px] border-t border-white/[.09] bg-[#080B10] p-5 shadow-[0_-22px_70px_-42px_rgba(0,0,0,.9)] sm:p-7 lg:sticky lg:top-4 lg:mt-0 lg:self-start lg:rounded-none lg:border-t-0 lg:bg-transparent lg:shadow-none">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 lg:hidden"/>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.24em] text-[#E9BD58]">Reserva imediata</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-.035em]">Como quer viajar?</h2>
            </div>
            <span className="rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-[9px] font-semibold text-white/45">AO · AOA</span>
          </div>

          <div role="group" aria-label="Categorias de transporte" className="mt-5 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {services.map((service) => {
              const selected = serviceType === service.id;
              return (
                <button key={service.id} type="button" aria-pressed={selected} onClick={() => { setServiceType(service.id); if (service.id === "MOTO_TAXI") setPassengerCount(1); }} className={`group relative flex min-w-[190px] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#E9BD58] lg:min-w-0 lg:w-full lg:p-3.5 ${selected ? "border-[#E9BD58]/65 bg-[linear-gradient(110deg,rgba(233,189,88,.12),rgba(233,189,88,.025))] shadow-[inset_0_0_0_1px_rgba(233,189,88,.08)]" : "border-white/[.09] bg-white/[.02] hover:border-white/20 hover:bg-white/[.04]"}`}>
                  <div className={`flex h-20 w-[7.25rem] shrink-0 items-center justify-center rounded-xl transition ${selected ? "bg-[#E9BD58]/[.11] text-[#F2CD70]" : "bg-white/[.045] text-white/55"}`}><MarkaVehicleIllustration kind={service.icon} className="h-16 w-28 sm:h-[4.5rem] sm:w-32"/></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><p className="text-sm font-semibold tracking-tight">{service.name}</p>{service.id === "TAXI" && <span className="rounded-full bg-white/[.07] px-2 py-0.5 text-[8px] font-semibold text-white/45">CONFORTO</span>}</div>
                    <p className={`mt-1 text-[10px] font-medium ${selected ? "text-[#F2CD70]" : "text-white/45"}`}>{service.subtitle}</p>
                    <p className="mt-1 text-[10px] text-white/35">{service.capacity}</p>
                  </div>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${selected ? "border-[#E9BD58] bg-[#E9BD58] text-[#111]" : "border-white/20 text-transparent"}`}><span className="text-[10px] font-black">✓</span></span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[9px] text-white/35 lg:hidden">Deslize para consultar todas as categorias.</p>
          <p className="mt-3 text-[10px] leading-4 text-white/40">{selectedService.description}</p>

          <div className="mt-5 space-y-4 border-t border-white/[.08] pt-5">
            {["TAXI", "EXECUTIVE"].includes(serviceType) && (
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/55">Número de passageiros</span>
                <select value={passengerCount} onChange={(event) => setPassengerCount(Math.max(1, Math.min(4, Number(event.target.value) || 1)))} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#11151B] px-3.5 text-sm text-white outline-none transition focus:border-[#E9BD58]/65">
                  {[1,2,3,4].map((count) => <option key={count} value={count}>{count} {count === 1 ? "passageiro" : "passageiros"}</option>)}
                </select>
              </label>
            )}
            {["VAN", "MINIBUS", "BUS", "COACH"].includes(serviceType) && (
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/55">Número de passageiros</span>
                <input type="number" min={1} max={100} value={passengerCount} onChange={(event) => setPassengerCount(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#11151B] px-3.5 text-sm text-white outline-none transition focus:border-[#E9BD58]/65" />
                <span className="mt-1 block text-[10px] text-white/35">A elegibilidade depende da capacidade confirmada da viatura.</span>
              </label>
            )}
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/55">Perfil de proteção</span>
              <select value={safetyMode} onChange={(event) => setSafetyMode(event.target.value as typeof safetyMode)} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#11151B] px-3.5 text-sm text-white outline-none transition focus:border-[#E9BD58]/65">
                <option value="STANDARD">Proteção padrão</option><option value="TRUSTED">Contacto de confiança</option><option value="CHILD">Menor · proteção reforçada</option>
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-white/[.08] bg-white/[.025] p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] font-bold uppercase tracking-[.17em] text-white/40">Resumo do percurso</span>
              <span className={`rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-wide ${pointsReady ? "bg-emerald-300/10 text-emerald-200" : "bg-white/[.06] text-white/40"}`}>{pointsReady ? "Pronto" : "Por definir"}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex flex-col items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border-2 border-[#80C8A0]"/><span className="h-5 w-px bg-white/15"/><span className="h-2.5 w-2.5 rounded-full border-2 border-[#E9BD58]"/></div>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="truncate text-[11px] text-white/75">{origin?.label ?? "Local de partida"}</p>
                <p className="truncate text-[11px] text-white/75">{destination?.label ?? "Destino"}</p>
              </div>
            </div>
          </div>

          {error && <div role="alert" className="mt-4 rounded-xl border border-rose-400/25 bg-rose-400/[.06] p-3 text-[11px] leading-5 text-rose-100">{error}</div>}
          <div className="mt-5">
            <button type="submit" disabled={!pointsReady || creating} className="group flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#F5D47C] via-[#E9BD58] to-[#DCA83D] px-4 py-3 text-sm font-bold text-[#17130A] shadow-[0_14px_36px_-16px_rgba(233,189,88,.6)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-35">
              {creating ? "A confirmar a sua viagem…" : "Encontrar uma viagem"} <span className="text-base transition-transform group-hover:translate-x-1">→</span>
            </button>
            <p className="mt-3 text-center text-[9px] leading-4 text-white/35">Sem cobrança nesta etapa. A disponibilidade depende de motoristas e veículos elegíveis.</p>
          </div>

          {rideResult?.ride && (
            <div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.055] p-4">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-300"/><p className="text-xs font-semibold text-emerald-100">Pedido recebido</p></div>
              <p className="mt-3 text-[9px] font-bold uppercase tracking-[.18em] text-white/40">Referência da viagem</p><p className="mt-1 break-all text-sm font-semibold">{requestReference}</p>
              <p className="mt-3 text-xs text-white/75">{currentStatus}</p>
              {rideResult.orchestration?.recoveryRequired && <p className="mt-2 text-[10px] leading-4 text-amber-200">Estamos a recuperar uma etapa operacional. Não crie um segundo pedido.</p>}
            </div>
          )}
          <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/[.07] pt-4 text-[9px] text-white/30"><span>⌁</span> Uma experiência de mobilidade pensada à sua medida.</div>
        </form>
      </div>
    </section>
  );
}
