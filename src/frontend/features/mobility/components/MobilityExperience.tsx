"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import MobilityLiveMap from "@/frontend/features/mobility/components/MobilityLiveMap";

type MapPoint = { lat: number; lon: number; label: string };
type RideResult = {
  ride?: { id: string; reference?: string | null; status?: string; serviceType?: string };
  orchestration?: { currentStep?: string | null; status?: string | null; recoveryRequired?: boolean };
  message?: string;
};

const services = [
  { id: "TAXI", name: "MARKA Go", detail: "Viagem urbana", seats: "Até 4 passageiros", badge: "Mais escolhido" },
  { id: "MOTO_TAXI", name: "MARKA Moto", detail: "Deslocação ágil", seats: "1 passageiro", badge: "Urbano" },
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

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-col items-start"}`}>
      <span className="font-black leading-none tracking-[-.12em] text-[#e9bd58]" style={{ fontSize: compact ? 28 : 54 }}>M</span>
      <span className={`font-semibold tracking-[.28em] text-white ${compact ? "text-xs" : "text-2xl"}`}>MARKA</span>
      {!compact && <span className="text-[9px] tracking-[.42em] text-[#e9bd58]">MOBILITY · ANGOLA</span>}
    </div>
  );
}

export default function MobilityExperience() {
  const [origin, setOrigin] = useState<MapPoint | null>(null);
  const [destination, setDestination] = useState<MapPoint | null>(null);
  const [serviceType, setServiceType] = useState<string>("TAXI");
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
    if (!origin || !destination) {
      setError("Defina a partida pelo GPS e pesquise um destino no mapa antes de pedir a viagem.");
      return;
    }
    if (origin.lat === destination.lat && origin.lon === destination.lon) {
      setError("A partida e o destino não podem ser o mesmo ponto.");
      return;
    }

    setCreating(true);
    const idempotencyKey = `marka-ride-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    try {
      const response = await fetch("/api/mobility/rides", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          serviceType,
          currency: "AOA",
          pickupLatitude: origin.lat,
          pickupLongitude: origin.lon,
          pickupAddress: origin.label,
          dropoffLatitude: destination.lat,
          dropoffLongitude: destination.lon,
          dropoffAddress: destination.label,
          safetyMode,
          metadata: { requestSource: "MARKA_MOBILITY_RIDER_WEB" },
        }),
      });
      const data = (await response.json()) as RideResult;
      if (!response.ok) throw new Error(data.message || "Não foi possível registar o pedido. Verifique a ligação e tente novamente.");
      setRideResult(data);
      setRequestReference(data.ride?.reference ?? data.ride?.id ?? "Pedido registado");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "O pedido não foi concluído. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  const currentStep = rideResult?.orchestration?.currentStep ?? rideResult?.ride?.status ?? "";
  const currentStatus = statusLabels[currentStep] ?? (currentStep ? currentStep.replaceAll("_", " ").toLowerCase() : "Pedido em processamento");

  return (
    <section className="space-y-5 text-white">
      <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#08090c] px-4 py-3 sm:px-5">
        <BrandMark compact />
        <Link href="/app/mobility/parceiros" className="rounded-full border border-[#e9bd58]/50 px-4 py-2.5 text-xs font-semibold text-[#f2cd70] transition hover:bg-[#e9bd58]/10">
          Área de parceiros <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#e9bd58]/25 bg-[#07090d]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#e9bd58]/10 blur-3xl" />
        <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:p-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.28em] text-[#e9bd58]">Mobilidade inteligente</p>
            <h1 className="mt-4 max-w-lg text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-4xl">A sua próxima viagem começa aqui.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/60">Escolha a partida, confirme o destino e envie um pedido real. A disponibilidade do motorista é confirmada pelo sistema operacional — não por estimativas fictícias.</p>
            <div className="mt-6 flex flex-wrap gap-2 text-[10px] text-white/55">
              <span className="rounded-full border border-white/10 px-3 py-2">GPS do dispositivo</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Rotas OpenStreetMap</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Pedido registado no sistema</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><p className="text-[10px] uppercase tracking-[.2em] text-[#e9bd58]">Planeie o percurso</p><h2 className="mt-1 text-lg font-semibold">Partida e destino</h2></div>
              <span className={`rounded-full border px-3 py-1.5 text-[10px] ${pointsReady ? "border-emerald-400/30 text-emerald-300" : "border-white/10 text-white/45"}`}>{pointsReady ? "Percurso definido" : "A aguardar locais"}</span>
            </div>
            <MobilityLiveMap onPointsChange={onPointsChange} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-white/10 bg-white/[.035] p-3">
                <p className="text-[9px] uppercase tracking-[.18em] text-white/40">Partida</p>
                <p className="mt-1 break-words text-xs text-white/85">{origin?.label ?? "Use «Usar GPS» no mapa"}</p>
              </div>
              <div className="min-w-0 rounded-xl border border-white/10 bg-white/[.035] p-3">
                <p className="text-[9px] uppercase tracking-[.18em] text-white/40">Destino</p>
                <p className="mt-1 break-words text-xs text-white/85">{destination?.label ?? "Pesquise um endereço ou referência"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#e9bd58]">A frota MARKA</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Conforto, presença e elegância em cada viagem.</h2>
          </div>
          <p className="max-w-sm text-xs leading-5 text-white/45">Uma apresentação visual dos estilos de viatura MARKA. A disponibilidade depende dos veículos e motoristas activos na plataforma.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { name: "MARKA Go", detail: "Mobilidade urbana", image: "photo-1618843479313-40f8afb4b4d8", alt: "Automóvel moderno para mobilidade urbana" },
            { name: "MARKA Executive", detail: "Conforto executivo", image: "photo-1563720223185-11003d516935", alt: "Automóvel de luxo para transporte executivo" },
            { name: "MARKA Business", detail: "Espaço para grupos", image: "photo-1552519507-da3b142c6e3d", alt: "Automóvel premium de carroçaria elegante" },
            { name: "MARKA Electric", detail: "Mobilidade eléctrica", image: "photo-1593941707882-a5bba14938c7", alt: "Veículo eléctrico moderno" },
          ].map((vehicle) => (
            <article key={vehicle.name} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0a0c11] transition hover:-translate-y-1 hover:border-[#e9bd58]/50">
              <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
                <img src={`https://images.unsplash.com/${vehicle.image}?auto=format&fit=crop&w=1000&q=85`} alt={vehicle.alt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#07090d]/70 via-transparent to-transparent" />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold">{vehicle.name}</h3>
                <p className="mt-1 text-xs text-white/50">{vehicle.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <form onSubmit={submitRide} className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-[1.7rem] border border-white/10 bg-[#0a0c11] p-4 sm:p-6">
          <div className="mb-4"><p className="text-[10px] uppercase tracking-[.24em] text-[#e9bd58]">01 · Serviço</p><h2 className="mt-1 text-xl font-semibold">Escolha o tipo de viagem</h2><p className="mt-2 text-xs leading-5 text-white/45">O tipo seleccionado é enviado ao dispatch, que procura veículos compatíveis e motoristas elegíveis.</p></div>
          <div className="grid gap-3 md:grid-cols-3">
            {services.map((service) => {
              const selected = serviceType === service.id;
              return (
                <button key={service.id} type="button" aria-pressed={selected} onClick={() => setServiceType(service.id)} className={`min-h-32 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#e9bd58] ${selected ? "border-[#e9bd58] bg-[#e9bd58]/10" : "border-white/10 bg-white/[.025] hover:border-white/25"}`}>
                  <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{service.name}</span><span className={`mt-1 h-3 w-3 shrink-0 rounded-full border ${selected ? "border-[#e9bd58] bg-[#e9bd58] ring-2 ring-[#e9bd58]/20" : "border-white/30"}`} /></div>
                  <p className="mt-2 text-xs text-white/60">{service.detail}</p>
                  <p className="mt-4 text-[10px] text-white/40">{service.seats}</p>
                  <span className="mt-2 inline-flex rounded-full border border-white/10 px-2 py-1 text-[9px] text-[#f2cd70]">{service.badge}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-medium text-white/75">Modo de segurança</span><select value={safetyMode} onChange={(event) => setSafetyMode(event.target.value as typeof safetyMode)} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#12151b] px-3 text-sm text-white outline-none focus:border-[#e9bd58]"><option value="STANDARD">Padrão</option><option value="TRUSTED">Contacto de confiança</option><option value="CHILD">Viagem de menor / protecção reforçada</option></select><span className="mt-1 block text-[10px] leading-4 text-white/35">A selecção é enviada para o motor de segurança; não substitui as regras de elegibilidade da plataforma.</span></label>
            <div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><p className="text-[9px] uppercase tracking-[.2em] text-white/40">Resumo</p><p className="mt-2 text-sm font-semibold">{selectedService.name}</p><p className="mt-1 text-xs text-white/50">{origin && destination ? "Percurso seleccionado e pronto para submissão." : "Defina partida e destino no mapa para activar o pedido."}</p></div>
          </div>
        </div>

        <aside className="h-fit rounded-[1.7rem] border border-[#e9bd58]/25 bg-[#0a0c11] p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[.24em] text-[#e9bd58]">02 · Confirmar</p>
          <h2 className="mt-2 text-xl font-semibold">Pedir viagem</h2>
          <p className="mt-3 text-xs leading-5 text-white/50">O pedido será validado pela sessão, segurança, matching e dispatch. Não mostramos tarifas nem disponibilidade inventadas.</p>
          {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs leading-5 text-red-200">{error}</div>}
          <button type="submit" disabled={!pointsReady || creating} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#f5d47c] to-[#dca83d] px-4 text-sm font-bold text-[#17130a] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40">
            {creating ? "A registar pedido…" : "Confirmar pedido de viagem →"}
          </button>
          <p className="mt-3 text-center text-[10px] leading-4 text-white/35">Sem cobrança nesta etapa. O pedido depende de uma sessão válida e de um motorista elegível.</p>
          {rideResult?.ride && (
            <div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/[.06] p-4">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /><p className="text-xs font-semibold text-emerald-200">Pedido recebido pelo sistema</p></div>
              <p className="mt-3 text-[10px] uppercase tracking-[.18em] text-white/40">Referência</p>
              <p className="mt-1 break-all text-sm font-semibold">{requestReference}</p>
              <p className="mt-3 text-xs text-white/70">Estado: {currentStatus}</p>
              {rideResult.orchestration?.recoveryRequired && <p className="mt-2 text-[10px] leading-4 text-amber-200">O pedido foi criado, mas o sistema assinalou uma recuperação operacional. Consulte o estado antes de tentar criar outro pedido.</p>}
            </div>
          )}
          <Link href="/app/mobility/parceiros" className="mt-4 flex min-h-11 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-white/65 transition hover:border-[#e9bd58]/50 hover:text-[#f2cd70]">Sou motorista parceiro</Link>
        </aside>
      </form>

      <p className="px-1 text-[10px] leading-5 text-white/35">Mapas e rotas utilizam serviços públicos OpenStreetMap/Nominatim/OSRM, sujeitos às respectivas políticas e limites. A localização só é obtida após uma acção explícita do utilizador.</p>
    </section>
  );
}
