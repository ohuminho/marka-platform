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
  { id: "TAXI", name: "MARKA Go", detail: "Táxi para deslocações urbanas e interurbanas", seats: "Até 4 passageiros", badge: "Táxi" },
  { id: "MOTO_TAXI", name: "MARKA Moto", detail: "Mototáxi para percursos rápidos", seats: "1 passageiro", badge: "Mototáxi" },
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
      <svg viewBox="0 0 48 40" role="img" aria-label="MARKA Mobility" className={compact ? "h-8 w-10" : "h-14 w-16"} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 27L9 22L14 10C15 7 18 5 21 5H33C36 5 39 7 40 10L44 22L47 25V32H2V30C2 29 3 28 5 27Z" fill="#11151B" stroke="#E9BD58" strokeWidth="1.8"/>
        <path d="M16 11C17 9 19 8 21 8H32C34 8 36 9 37 12L40 20H12L16 11Z" fill="#9DB2C2" fillOpacity=".28" stroke="#F5D98F" strokeOpacity=".65"/>
        <path d="M25 8V20" stroke="#F5D98F" strokeOpacity=".5"/>
        <path d="M4 25H11M39 25H46" stroke="#F5D98F" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="31" r="4" fill="#080A0E" stroke="#D7DCE2" strokeWidth="1.5"/>
        <circle cx="38" cy="31" r="4" fill="#080A0E" stroke="#D7DCE2" strokeWidth="1.5"/>
      </svg>
      <div className={compact ? "flex flex-col gap-0.5" : "flex flex-col gap-1"}>
        <span className={`font-semibold tracking-[.22em] text-white ${compact ? "text-xs" : "text-2xl"}`}>MARKA</span>
        {!compact && <span className="text-[9px] tracking-[.35em] text-[#e9bd58]">MOBILITY · ANGOLA</span>}
      </div>
    </div>
  );
}

type VehicleKind = "sedan" | "executive" | "motorcycle" | "van";

function VehicleArtwork({ kind, label }: { kind: VehicleKind; label: string }) {
  const isBike = kind === "motorcycle";
  const isVan = kind === "van";
  const showTaxiSign = kind === "sedan";
  return (
    <svg viewBox="0 0 640 300" role="img" aria-label={label} className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`body-${kind}`} x1="108" y1="82" x2="520" y2="252" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7E6B6" />
          <stop offset=".3" stopColor="#D7B36B" />
          <stop offset=".72" stopColor="#9B702E" />
          <stop offset="1" stopColor="#40301B" />
        </linearGradient>
        <linearGradient id={`glass-${kind}`} x1="260" y1="80" x2="390" y2="182" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9E8F2" stopOpacity=".88" />
          <stop offset="1" stopColor="#33485B" stopOpacity=".72" />
        </linearGradient>
        <linearGradient id={`metal-${kind}`} x1="100" y1="210" x2="540" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF2CC" stopOpacity=".9" />
          <stop offset=".45" stopColor="#D8B46D" stopOpacity=".35" />
          <stop offset="1" stopColor="#FFF0C7" stopOpacity=".7" />
        </linearGradient>
        <filter id={`shadow-${kind}`} x="25" y="30" width="590" height="270" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <ellipse cx="320" cy="258" rx="230" ry="17" fill="#000" opacity=".48" filter={`url(#shadow-${kind})`} />
      {isBike ? (
        <g>
          <path d="M156 224L226 177L325 177L388 224L474 224" stroke="#D9AA4B" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M226 177L262 119L349 119L388 177L325 177L294 224" stroke="#E5E8EB" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M262 119L280 91H348L365 119" stroke="#D9AA4B" strokeWidth="8" strokeLinecap="round"/>
          <path d="M281 92L300 68H350" stroke="#E5E8EB" strokeWidth="7" strokeLinecap="round"/>
          <path d="M300 68L322 68L336 92" stroke="#D9AA4B" strokeWidth="7" strokeLinecap="round"/>
          <path d="M206 177L180 149M180 149L158 149" stroke="#E9BD58" strokeWidth="7" strokeLinecap="round"/>
          <path d="M365 119L402 103L421 103" stroke="#E9BD58" strokeWidth="7" strokeLinecap="round"/>
          <path d="M392 177L426 177" stroke="#E9BD58" strokeWidth="6" strokeLinecap="round"/>
          <circle cx="156" cy="224" r="39" fill="#080B10" stroke="#D7DCE2" strokeWidth="7"/>
          <circle cx="156" cy="224" r="15" fill="#A7AEB5" stroke="#E9BD58" strokeWidth="5"/>
          <circle cx="474" cy="224" r="39" fill="#080B10" stroke="#D7DCE2" strokeWidth="7"/>
          <circle cx="474" cy="224" r="15" fill="#A7AEB5" stroke="#E9BD58" strokeWidth="5"/>
          <path d="M294 224L321 224L337 177" stroke="#BFC7CF" strokeWidth="7" strokeLinecap="round"/>
          <path d="M274 151H344" stroke="#F7E6B6" strokeOpacity=".55" strokeWidth="3"/>
        </g>
      ) : (
        <g>
          <path d="M67 211L92 194L144 183L207 116C222 100 242 91 269 89L394 89C425 90 449 103 470 130L511 181L558 194C575 199 587 211 589 229L588 244H53L54 229C55 221 59 215 67 211Z" fill={`url(#body-${kind})`} stroke="#F4D99A" strokeWidth="3"/>
          <path d="M224 123C238 105 252 99 274 98H391C414 99 431 109 447 131L477 174H179L224 123Z" fill={`url(#glass-${kind})`} stroke="#F7E6B6" strokeOpacity=".75" strokeWidth="3"/>
          <path d="M326 100V174M189 178H483" stroke="#F7E6B6" strokeOpacity=".45" strokeWidth="3"/>
          <path d="M247 103L216 174M403 101L434 174" stroke="#F7E6B6" strokeOpacity=".28" strokeWidth="2"/>
          <path d="M79 211L148 197L176 204M505 197L558 209" stroke="#FFF1CB" strokeOpacity=".8" strokeWidth="5" strokeLinecap="round"/>
          <path d="M65 225H123M523 225H578" stroke="#EBD08A" strokeWidth="5" strokeLinecap="round"/>
          <path d="M171 194H483" stroke={`url(#metal-${kind})`} strokeWidth="3" strokeLinecap="round"/>
          <path d="M276 185V221M408 185V221" stroke="#49371F" strokeOpacity=".45" strokeWidth="2"/>
          <path d="M294 193H325M345 193H376" stroke="#FFF0C8" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="177" cy="236" r="38" fill="#080B10" stroke="#C8CDD2" strokeWidth="6"/>
          <circle cx="177" cy="236" r="20" fill="#9CA5AE" stroke="#E9D7AE" strokeWidth="4"/>
          <circle cx="177" cy="236" r="7" fill="#252B31"/>
          <circle cx="476" cy="236" r="38" fill="#080B10" stroke="#C8CDD2" strokeWidth="6"/>
          <circle cx="476" cy="236" r="20" fill="#9CA5AE" stroke="#E9D7AE" strokeWidth="4"/>
          <circle cx="476" cy="236" r="7" fill="#252B31"/>
          <path d="M92 202L129 195L149 199L142 211H89Z" fill="#FFF3D1" fillOpacity=".9"/>
          <path d="M520 196L557 207L566 218H525L512 205Z" fill="#E87B52" fillOpacity=".9"/>
          {showTaxiSign && <g>
            <path d="M298 83H368L363 64H304L298 83Z" fill="#11151B" stroke="#F2D58F" strokeWidth="2"/>
            <path d="M307 68H359" stroke="#E9BD58" strokeWidth="3" strokeLinecap="round"/>
            <text x="333" y="80" textAnchor="middle" fill="#F8E7B9" fontSize="11" fontWeight="700" letterSpacing="2">TAXI</text>
          </g>}
          {isVan && <path d="M350 100V174M383 100V174" stroke="#49371F" strokeOpacity=".55" strokeWidth="3"/>}
        </g>
      )}
      <path d="M72 270H568" stroke="#E9BD58" strokeOpacity=".28" strokeWidth="2" strokeLinecap="round"/>
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
      setError("Selecione uma organização ativa para solicitar uma viagem.");
      return;
    }
    if (!origin || !destination) {
      setError("Defina a partida pelo GPS e pesquise um destino no mapa antes de pedir a viagem.");
      return;
    }
    if (origin.lat === destination.lat && origin.lon === destination.lon) {
      setError("A partida e o destino não podem ser o mesmo ponto.");
      return;
    }

    setCreating(true);
    const requestPayload = {
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
      window.sessionStorage.setItem(storageKey, JSON.stringify({
        key: idempotencyKey,
        fingerprint: requestFingerprint,
      }));
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
        if (pending?.key === idempotencyKey && !data.orchestration?.recoveryRequired) {
          window.sessionStorage.removeItem(storageKey);
        }
      } catch {
        // Session storage is an optional retry aid; the server remains authoritative.
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
    <section className="space-y-5 text-white">
      <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#08090c] px-4 py-3 sm:px-5">
        <BrandMark compact />
        <Link href="/app/driver" className="rounded-full border border-[#e9bd58]/50 px-4 py-2.5 text-xs font-semibold text-[#f2cd70] transition hover:bg-[#e9bd58]/10">
          Sou motorista <span aria-hidden="true">↗</span>
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
            <p className="mt-4 max-w-md text-sm leading-6 text-white/60">Para deslocações individuais, escolha Táxi ou Mototáxi. Transporte de grupos, mercadorias, água e materiais tem uma área própria de contratação de fornecedores.</p>
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
                max={serviceType === "MOTO_TAXI" ? 1 : 4}
                value={serviceType === "MOTO_TAXI" ? 1 : passengerCount}
                disabled={serviceType === "MOTO_TAXI"}
                onChange={(event) => setPassengerCount(Math.max(1, Math.min(4, Number(event.target.value) || 1)))}
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
            <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#e9bd58]">Mobilidade individual</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Táxi e mototáxi.</h2>
            <div className="mt-4 h-px w-24 bg-gradient-to-r from-[#e9bd58] via-[#e9bd58]/50 to-transparent" />
          </div>
          <p className="max-w-sm text-xs leading-5 text-white/45">Ilustrações dos dois serviços de transporte individual. A disponibilidade depende dos motoristas e veículos parceiros activos.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { name: "MARKA Táxi", detail: "Mobilidade individual", kind: "sedan" as const },
            { name: "MARKA Mototáxi", detail: "Percursos rápidos", kind: "motorcycle" as const },
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
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Transportes e serviços especializados.</h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-white/50">Van, Minibus, Bus e Coach são para grupos; cisternas, basculantes e outros camiões são para cargas e materiais. Cada contratação deve identificar o fornecedor, a capacidade, a rota e o preço — nunca criar uma viagem de táxi.</p>
          </div>
          <Link href="/app/driver" className="rounded-full border border-[#e9bd58]/40 px-4 py-2.5 text-xs font-semibold text-[#f2cd70] transition hover:bg-[#e9bd58]/10">Área de parceiros ↗</Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <div><p className="text-[9px] uppercase tracking-[.2em] text-[#e9bd58]">MARKA Grupos</p><h3 className="mt-1 text-lg font-semibold text-white">Transporte de pessoas</h3></div>
            <p className="mt-2 text-xs leading-5 text-white/50">Contratação de viaturas de maior capacidade, com motorista parceiro, para grupos e deslocações organizadas.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Van / carrinha","Minibus","Bus","Coach"].map((item) => <div key={item} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-xs text-white/75">{item}</div>)}
            </div>
            <Link href="/app/marketplace" className="mt-4 inline-flex text-xs font-semibold text-[#f2cd70] underline-offset-4 hover:underline">Explorar fornecedores no Marketplace ↗</Link>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[9px] uppercase tracking-[.2em] text-[#e9bd58]">MARKA Cargo</p><h3 className="mt-1 text-lg font-semibold text-white">Transporte de mercadorias</h3></div>
              <span className="text-2xl" aria-hidden="true">▰</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/50">Transporte de mercadorias e materiais com viatura e motorista de um parceiro independente.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Triciclo de carga","Pick-up","Carrinha de caixa","Camião basculante","Camião pesado"].map((item) => <div key={item} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-xs text-white/75">{item}</div>)}
            </div>
            <p className="mt-3 text-[10px] leading-4 text-white/40">Aqui contrata-se o transporte. A viatura é escolhida conforme o tipo, o peso e o volume da carga.</p>
            <Link href="/app/marketplace" className="mt-4 inline-flex text-xs font-semibold text-[#f2cd70] underline-offset-4 hover:underline">Encontrar transportadores ↗</Link>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[9px] uppercase tracking-[.2em] text-[#e9bd58]">MARKA Supply</p><h3 className="mt-1 text-lg font-semibold text-white">Comprar água e materiais</h3></div>
              <span className="text-2xl" aria-hidden="true">◉</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/50">O cliente compra o produto por quantidade. O fornecedor vende e organiza a entrega com cisterna, basculante ou outro veículo adequado.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Água por litro (L)","Água por metro cúbico (m³)","Areia","Brita","Burgau"].map((item) => <div key={item} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-xs text-white/75">{item}</div>)}
            </div>
            <p className="mt-3 text-[10px] leading-4 text-white/40">1 m³ de água = 1.000 litros. A cisterna é o veículo de entrega, não o produto vendido.</p>
            <Link href="/app/marketplace" className="mt-4 inline-flex text-xs font-semibold text-[#f2cd70] underline-offset-4 hover:underline">Comprar produtos no Marketplace ↗</Link>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[9px] uppercase tracking-[.2em] text-[#e9bd58]">MARKA Assist</p><h3 className="mt-1 text-lg font-semibold text-white">Assistência e reboque</h3></div>
              <span className="text-2xl" aria-hidden="true">↗</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/50">Reboque, recuperação e apoio no local prestados por empresas e profissionais parceiros.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Reboque / remoção","Recuperação após acidente","Desempanagem no local","Assistência de pneus e bateria"].map((item) => <div key={item} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-xs text-white/75">{item}</div>)}
            </div>
            <Link href="/app/marketplace" className="mt-4 inline-flex text-xs font-semibold text-[#f2cd70] underline-offset-4 hover:underline">Explorar prestadores no Marketplace ↗</Link>
          </article>
        </div>
      </section>

      <form onSubmit={submitRide} className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-[1.7rem] border border-white/10 bg-[#0a0c11] p-4 sm:p-6">
          <div className="mb-4"><p className="text-[10px] uppercase tracking-[.24em] text-[#e9bd58]">01 · Serviço</p><h2 className="mt-1 text-xl font-semibold">Escolha Táxi ou Mototáxi</h2><p className="mt-2 text-xs leading-5 text-white/45">Apenas estes dois serviços entram no motor de viagens e no dispatch de passageiros.</p></div>
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
          <Link href="/app/driver" className="mt-4 flex min-h-11 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-white/65 transition hover:border-[#e9bd58]/50 hover:text-[#f2cd70]">Aceder ao espaço do motorista</Link>
        </aside>
      </form>

      <p className="px-1 text-[10px] leading-5 text-white/35">Mapas e rotas utilizam serviços públicos OpenStreetMap/Nominatim/OSRM, sujeitos às respectivas políticas e limites. A localização só é obtida após uma acção explícita do utilizador.</p>
    </section>
  );
}
