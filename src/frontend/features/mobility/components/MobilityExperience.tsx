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
  { id: "TAXI", name: "MARKA Go", detail: "Automóvel para deslocações urbanas", seats: "Até 4 passageiros", badge: "Urbano" },
  { id: "MOTO_TAXI", name: "MARKA Moto", detail: "Mototáxi para percursos rápidos", seats: "1 passageiro", badge: "Ágil" },
  { id: "VAN", name: "MARKA Van", detail: "Viatura espaçosa para grupos e bagagem", seats: "Capacidade conforme viatura", badge: "Espaço extra" },
  { id: "MINIBUS", name: "MARKA Minibus", detail: "Transporte colectivo de pequena capacidade", seats: "Capacidade conforme viatura", badge: "Colectivo" },
  { id: "BUS", name: "MARKA Bus", detail: "Transporte colectivo de maior capacidade", seats: "Capacidade conforme viatura", badge: "Grupos" },
  { id: "COACH", name: "MARKA Coach", detail: "Viagens de grupo e trajectos interurbanos", seats: "Capacidade conforme viatura", badge: "Longa distância" },
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

type VehicleKind = "sedan" | "executive" | "motorcycle" | "van";

function VehicleArtwork({ kind, label }: { kind: VehicleKind; label: string }) {
  const isBike = kind === "motorcycle";
  const isVan = kind === "van";
  return (
    <svg viewBox="0 0 640 300" role="img" aria-label={label} className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`body-${kind}`} x1="120" y1="80" x2="500" y2="250" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5D98F" />
          <stop offset=".48" stopColor="#B88935" />
          <stop offset="1" stopColor="#51402A" />
        </linearGradient>
        <linearGradient id={`glass-${kind}`} x1="240" y1="90" x2="380" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D8E1E8" stopOpacity=".78" />
          <stop offset="1" stopColor="#52616D" stopOpacity=".42" />
        </linearGradient>
      </defs>
      <ellipse cx="320" cy="246" rx="238" ry="22" fill="#000" opacity=".42" />
      {!isBike && <g>
      <path d="M70 224C90 208 112 201 151 195L205 130C222 109 245 99 275 96L395 96C426 97 451 111 471 139L511 188L554 199C572 204 584 217 586 235L585 247H55L56 237C58 231 63 227 70 224Z" fill={`url(#body-${kind})`} stroke="#F5D98F" strokeOpacity=".8" strokeWidth="3"/>
      <path d="M222 137C238 116 255 109 279 108H392C414 109 433 120 449 143L478 183H184L222 137Z" fill={`url(#glass-${kind})`} stroke="#F5D98F" strokeOpacity=".55" strokeWidth="3"/>
      <path d="M326 110V183M190 187H482" stroke="#F5D98F" strokeOpacity=".5" strokeWidth="3"/>
      <path d="M82 215L148 204L176 211M510 202L554 211" stroke="#FFF0C8" strokeOpacity=".75" strokeWidth="5" strokeLinecap="round"/>
      <path d="M70 231H120M530 231H577" stroke="#F6D98A" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="177" cy="237" r="39" fill="#080A0D" stroke="#A9A9A9" strokeWidth="5"/>
      <circle cx="177" cy="237" r="19" fill="#A78B58" stroke="#E9D5A5" strokeWidth="4"/>
      <circle cx="477" cy="237" r="39" fill="#080A0D" stroke="#A9A9A9" strokeWidth="5"/>
      <circle cx="477" cy="237" r="19" fill="#A78B58" stroke="#E9D5A5" strokeWidth="4"/>
      <path d="M108 180H150M493 181H530" stroke="#FFF1CC" strokeWidth="4" strokeLinecap="round"/>
      </g>}
      {isBike && <g transform="translate(0 2)"><path d="M170 210L240 165L330 165L390 210L460 210" stroke="#E9BD58" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/><path d="M240 165L280 115L355 115L390 165" stroke="#D9DDE0" strokeWidth="10" strokeLinecap="round"/><path d="M280 115L300 90H355" stroke="#E9BD58" strokeWidth="8" strokeLinecap="round"/><circle cx="170" cy="210" r="36" fill="#090B0E" stroke="#D6D6D6" strokeWidth="7"/><circle cx="460" cy="210" r="36" fill="#090B0E" stroke="#D6D6D6" strokeWidth="7"/></g>}
      {isVan && <path d="M354 112V188M385 112V188" stroke="#5D6670" strokeWidth="4" />}
      {kind === "executive" && <path d="M218 193H450" stroke="#FFF0C8" strokeOpacity=".35" strokeWidth="2" />}
    </svg>
  );
}

export default function MobilityExperience() {
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
          passengerCount,
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

      <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#e9bd58]/30 bg-[#07090d] shadow-[0_24px_90px_-38px_rgba(233,189,88,.22)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,10,.97)_0%,rgba(5,7,10,.88)_42%,rgba(5,7,10,.62)_100%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_18%,rgba(233,189,88,.22),transparent_34%),linear-gradient(0deg,rgba(5,7,10,.55),transparent_55%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#e9bd58]/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-[28%] h-64 w-64 rounded-full bg-sky-400/[.07] blur-3xl" />
        <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:p-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.28em] text-[#e9bd58]">Mobilidade inteligente</p>
            <h1 className="mt-4 max-w-lg text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-4xl">A sua próxima viagem começa aqui.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/60">Escolha a partida, confirme o destino e envie um pedido real. A disponibilidade do motorista é confirmada pelo sistema operacional — não por estimativas fictícias.</p>
            <div className="mt-6 flex flex-wrap gap-2 text-[10px] text-white/75">
              <span className="rounded-full border border-white/15 bg-black/25 px-3 py-2 backdrop-blur-sm">GPS do dispositivo</span>
              <span className="rounded-full border border-white/15 bg-black/25 px-3 py-2 backdrop-blur-sm">Rotas OpenStreetMap</span>
              <span className="rounded-full border border-[#e9bd58]/35 bg-[#e9bd58]/[.08] px-3 py-2 text-[#f2cd70] backdrop-blur-sm">Pedido registado no sistema</span>
            </div>
            <div className="mt-5 max-w-xs">
              <label htmlFor="mobility-passengers" className="mb-2 block text-xs font-semibold text-white/75">Número de passageiros</label>
              <input
                id="mobility-passengers"
                type="number"
                min={1}
                max={serviceType === "MOTO_TAXI" ? 1 : 100}
                value={serviceType === "MOTO_TAXI" ? 1 : passengerCount}
                disabled={serviceType === "MOTO_TAXI"}
                onChange={(event) => setPassengerCount(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#e9bd58]"
              />
              <p className="mt-1 text-[11px] text-white/45">A atribuição considera a lotação registada e aprovada da viatura.</p>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { value: "01", label: "Escolha a rota" },
                { value: "02", label: "Defina o serviço" },
                { value: "03", label: "Envie o pedido" },
              ].map((step) => (
                <div key={step.value} className="rounded-xl border border-white/10 bg-black/30 p-3 backdrop-blur-md">
                  <span className="text-[10px] font-semibold tracking-[.2em] text-[#e9bd58]">{step.value}</span>
                  <p className="mt-2 text-[10px] leading-4 text-white/75 sm:text-xs">{step.label}</p>
                </div>
              ))}
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
            <div className="mt-4 h-px w-24 bg-gradient-to-r from-[#e9bd58] via-[#e9bd58]/50 to-transparent" />
          </div>
          <p className="max-w-sm text-xs leading-5 text-white/45">Uma apresentação visual dos estilos de viatura MARKA. A disponibilidade depende dos veículos e motoristas activos na plataforma.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { name: "MARKA Go", detail: "Mobilidade urbana", kind: "sedan" as const },
            { name: "MARKA Executive", detail: "Conforto executivo", kind: "executive" as const },
            { name: "MARKA Moto", detail: "Mototáxi ágil", kind: "motorcycle" as const },
            { name: "MARKA Van", detail: "Grupos e bagagem", kind: "van" as const },
          ].map((vehicle) => (
            <article key={vehicle.name} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0a0c11] transition hover:-translate-y-1 hover:border-[#e9bd58]/50">
              <div className="relative flex aspect-[16/10] items-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_85%,rgba(233,189,88,.13),transparent_55%),linear-gradient(145deg,#171a20,#080a0e)] p-3">
                <div aria-hidden="true" className="absolute inset-x-8 bottom-7 h-px bg-gradient-to-r from-transparent via-[#e9bd58]/45 to-transparent" />
                <VehicleArtwork kind={vehicle.kind} label={`Ilustração vetorial MARKA: ${vehicle.name}`} />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold">{vehicle.name}</h3>
                <p className="mt-1 text-xs text-white/50">{vehicle.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-5 rounded-[1.7rem] border border-[#e9bd58]/20 bg-[#090b10] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#e9bd58]">MARKA Mobility · expansão de serviços</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Mais do que transporte de passageiros.</h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-white/50">O ecossistema inclui transporte de mercadorias e assistência rodoviária. Estes serviços têm fluxos próprios de cotação, pagamento e despacho — não são enviados como uma viagem de táxi.</p>
          </div>
          <Link href="/app/mobility/parceiros" className="rounded-full border border-[#e9bd58]/40 px-4 py-2.5 text-xs font-semibold text-[#f2cd70] transition hover:bg-[#e9bd58]/10">Área de parceiros ↗</Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[9px] uppercase tracking-[.2em] text-[#e9bd58]">MARKA Cargo</p><h3 className="mt-1 text-lg font-semibold text-white">Transporte de mercadorias</h3></div>
              <span className="text-2xl" aria-hidden="true">▰</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/50">Contratação de transporte completo com veículo e motorista do parceiro.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Triciclo de carga","Pick-up aberta","Carrinha fechada / caixa","Camião ligeiro","Camião de plataforma","Camião basculante","Camião pesado","Cisterna de água"].map((item) => <div key={item} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-xs text-white/75">{item}</div>)}
            </div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[9px] uppercase tracking-[.2em] text-[#e9bd58]">MARKA Assist</p><h3 className="mt-1 text-lg font-semibold text-white">Assistência e reboque</h3></div>
              <span className="text-2xl" aria-hidden="true">↗</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/50">Apoio ao veículo imobilizado, com prestador compatível e despacho condicionado à confirmação de pagamento no servidor.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Reboque / remoção","Recuperação após acidente","Desempanagem no local","Assistência de pneus e bateria"].map((item) => <div key={item} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-xs text-white/75">{item}</div>)}
            </div>
          </article>
        </div>
      </section>

      <form onSubmit={submitRide} className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-[1.7rem] border border-white/10 bg-[#0a0c11] p-4 sm:p-6">
          <div className="mb-4"><p className="text-[10px] uppercase tracking-[.24em] text-[#e9bd58]">01 · Serviço</p><h2 className="mt-1 text-xl font-semibold">Escolha o tipo de viagem</h2><p className="mt-2 text-xs leading-5 text-white/45">O tipo seleccionado é enviado ao dispatch, que procura veículos compatíveis e motoristas elegíveis.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
