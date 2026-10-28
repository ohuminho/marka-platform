"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";
import MobilityTripAdSlot from "@/frontend/features/mobility/components/MobilityTripAdSlot";
import type { MobilityAdContext } from "@/monetization/ads/ad.types";

type Audience = "rider" | "driver";
type Ride = {
  id: string; reference?: string | null; status: string; serviceType?: string;
  pickupAddress?: string | null; dropoffAddress?: string | null;
  pickupLatitude?: number | string | null; pickupLongitude?: number | string | null;
  dropoffLatitude?: number | string | null; dropoffLongitude?: number | string | null;
  startedAt?: string | null; rider?: { name?: string | null } | null;
  driver?: { user?: { name?: string | null } | null; location?: { latitude?: number | string | null; longitude?: number | string | null; lat?: number | string | null; lng?: number | string | null } | null } | null;
  vehicle?: { make?: string | null; model?: string | null; plateNumber?: string | null; registrationNumber?: string | null } | null;
};
type RideAction = "ACCEPT" | "DRIVER_ARRIVING" | "DRIVER_ARRIVED" | "START_TRIP" | "BEGIN_TRIP_PROGRESS";
type RidePayload = { ride?: Ride | null; orchestration?: { currentStep?: string | null } | null; message?: string };
const ACTIVE = ["REQUESTED", "SEARCHING", "MATCHED", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "TRIP_STARTED", "TRIP_IN_PROGRESS"];
const STATUS: Record<string, string> = {
  REQUESTED: "Pedido recebido", SEARCHING: "A encontrar motorista", MATCHED: "Motorista identificado",
  DRIVER_ASSIGNED: "Motorista atribuído", DRIVER_ARRIVING: "Motorista a caminho", DRIVER_ARRIVED: "Motorista chegou",
  TRIP_STARTED: "Viagem iniciada", TRIP_IN_PROGRESS: "Viagem em curso",
};
function num(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const result = Number(value); return Number.isFinite(result) ? result : null;
}
function distance(a: number, b: number, c: number, d: number) {
  const rad = (v: number) => v * Math.PI / 180;
  const x = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function MobilityActiveTripExperience({ audience }: { audience: Audience }) {
  const { activeOrganization, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<RidePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adsEnabled, setAdsEnabled] = useState(true);\n  const [adsPreferenceLoaded, setAdsPreferenceLoaded] = useState(false);
  const [lastAdDismissedAt, setLastAdDismissedAt] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const organizationId = activeOrganization?.id;\n\n  useEffect(() => {\n    try {\n      const saved = window.localStorage.getItem("marka.ads.enabled." + audience);\n      if (saved !== null) setAdsEnabled(saved === "true");\n    } catch {\n      setAdsEnabled(false);\n    } finally {\n      setAdsPreferenceLoaded(true);\n    }\n  }, [audience]);\n\n  const updateAdsEnabled = (enabled: boolean) => {\n    setAdsEnabled(enabled);\n    try { window.localStorage.setItem("marka.ads.enabled." + audience, String(enabled)); }\n    catch { setAdsEnabled(false); }\n  };

  const refresh = useCallback(async () => {
    if (!organizationId) { setPayload(null); setLoading(false); return; }
    try {
      const endpoint = audience === "driver" ? "/api/mobility/driver/active-ride" : "/api/mobility/rides";
      const response = await fetch(endpoint, { credentials: "include", cache: "no-store", headers: { "X-Organization-Id": organizationId } });
      const data = (await response.json()) as RidePayload;
      if (!response.ok) throw new Error(data.message || "Não foi possível consultar a viagem.");
      setPayload(data); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha de ligação."); }
    finally { setLoading(false); }
  }, [audience, organizationId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const ride = payload?.ride ?? null;
  const inProgress = ride?.status === "TRIP_IN_PROGRESS";
  const startedAt = ride?.startedAt ? new Date(ride.startedAt).getTime() : null;
  const destinationDistance = useMemo(() => {
    if (!ride) return null;
    const targetLat = num(ride.dropoffLatitude), targetLng = num(ride.dropoffLongitude);
    const loc = ride.driver?.location;
    const currentLat = num(loc?.latitude ?? loc?.lat), currentLng = num(loc?.longitude ?? loc?.lng);
    if (targetLat === null || targetLng === null || currentLat === null || currentLng === null) return null;
    return distance(currentLat, currentLng, targetLat, targetLng);
  }, [ride]);

  const adContext: MobilityAdContext = {
    adsEnabled: adsPreferenceLoaded && adsEnabled, rideStatus: ride?.status, tripStartedAt: startedAt,
    isNearDestination: destinationDistance === null || destinationDistance <= 700,
    isNavigationActive: false, isPaymentFlowActive: !inProgress, isSafetyFlowActive: !inProgress,
    lastAdDismissedAt,
  };
  const active = Boolean(ride && ACTIVE.includes(ride.status));
  const driverAction = useMemo(() => {
    if (audience !== "driver") return null;
    const step = payload?.orchestration?.currentStep;
    const actions: Record<string, { action: RideAction; label: string }> = {
      DRIVER_ASSIGNED: { action: "ACCEPT", label: "Aceitar viagem" },
      DRIVER_ACCEPTED: { action: "DRIVER_ARRIVING", label: "Iniciar deslocação para recolha" },
      DRIVER_ARRIVING: { action: "DRIVER_ARRIVED", label: "Confirmar chegada" },
      DRIVER_ARRIVED: { action: "START_TRIP", label: "Iniciar viagem" },
      TRIP_STARTED: { action: "BEGIN_TRIP_PROGRESS", label: "Confirmar passageiro a bordo e iniciar percurso" },
    };
    return step ? actions[step] ?? null : null;
  }, [audience, payload?.orchestration?.currentStep]);

  const performDriverAction = async () => {
    if (!ride || !organizationId || !driverAction || actionLoading) return;
    setActionLoading(true); setActionError(null);
    try {
      const response = await fetch("/api/mobility/rides/" + encodeURIComponent(ride.id), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId, "Idempotency-Key": "marka-driver-" + ride.id + "-" + driverAction.action + "-" + Date.now() },
        body: JSON.stringify({ action: driverAction.action, safetyMode: "STANDARD" }),
      });
      const data = (await response.json()) as RidePayload;
      if (!response.ok) throw new Error(data.message || "Não foi possível atualizar o estado da viagem.");
      setPayload(data);
      await refresh();
    } catch (e) { setActionError(e instanceof Error ? e.message : "Falha ao atualizar a viagem."); }
    finally { setActionLoading(false); }
  };

  return <section className="overflow-hidden rounded-[2rem] border border-[#d8b35a]/25 bg-[#080a0e] text-white shadow-[0_28px_90px_rgba(0,0,0,.28)]">
    <header className="relative border-b border-white/[.08] px-5 py-6 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(216,179,90,.14),transparent_55%)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[9px] font-semibold uppercase tracking-[.3em] text-[#e9bd58]">{audience === "driver" ? "Partner workspace" : "Passenger journey"}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] sm:text-3xl">{audience === "driver" ? "A sua operação, em tempo real." : "A sua viagem, com confiança."}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">{audience === "driver" ? "Estado operacional e informação essencial, sem ruído visual." : "Acompanhe a viagem e os dados essenciais do parceiro num espaço claro e discreto."}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-2 text-[9px] uppercase tracking-[.18em] text-white/65"><span className="h-1.5 w-1.5 rounded-full bg-[#e9bd58]" /> Atualização automática</span>
      </div>
    </header>
    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_.72fr] lg:p-8">
      <div className="min-w-0">
        {authLoading || loading ? <div className="animate-pulse rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-white/45">A sincronizar a sua viagem…</div>
        : error ? <div role="status" className="rounded-2xl border border-rose-300/20 bg-rose-300/[.05] p-5"><p className="text-sm text-rose-100">Não foi possível atualizar a viagem.</p><button onClick={() => { setLoading(true); void refresh(); }} className="mt-3 rounded-full border border-white/15 px-4 py-2 text-xs text-white/75">Tentar novamente</button></div>
        : !ride || !ACTIVE.includes(ride.status) ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6 sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e9bd58]/25 bg-[#e9bd58]/[.07] text-xl text-[#e9bd58]">{audience === "driver" ? "↗" : "⌖"}</div><h3 className="mt-4 text-lg font-semibold">{audience === "driver" ? "Sem viagem atribuída neste momento" : "Ainda não tem uma viagem ativa"}</h3><p className="mt-2 max-w-md text-sm leading-6 text-white/45">{audience === "driver" ? "Quando uma viagem for atribuída à sua conta, os detalhes aparecem aqui automaticamente." : "O estado da viagem aparecerá aqui assim que um pedido estiver ativo."}</p><button onClick={() => { setLoading(true); void refresh(); }} className="mt-5 rounded-full border border-[#e9bd58]/35 px-4 py-2.5 text-xs font-semibold text-[#f0d58e]">Atualizar estado</button></div>
        : <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.055] to-transparent p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.22em] text-white/35">Referência da viagem</p><p className="mt-1 text-lg font-semibold tracking-wide">{ride.reference || ride.id.slice(0, 8).toUpperCase()}</p></div><span className="rounded-full border border-[#e9bd58]/30 bg-[#e9bd58]/[.08] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.12em] text-[#f0d58e]">{STATUS[ride.status] || ride.status.replaceAll("_", " ")}</span></div>
          <div className="mt-6 space-y-0"><div className="flex gap-3 pb-5"><div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-sky-300/60 text-[8px] text-sky-200">●</div><div className="min-w-0"><p className="text-[9px] uppercase tracking-[.18em] text-white/35">Recolha</p><p className="mt-1 break-words text-sm text-white/90">{ride.pickupAddress || "Ponto de recolha registado"}</p></div></div><div className="ml-[9px] h-5 border-l border-dashed border-white/20" /><div className="flex gap-3 pt-3"><div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#e9bd58]/70 text-[8px] text-[#e9bd58]">◆</div><div className="min-w-0"><p className="text-[9px] uppercase tracking-[.18em] text-white/35">Destino</p><p className="mt-1 break-words text-sm text-white/90">{ride.dropoffAddress || "Destino registado no pedido"}</p></div></div></div>
          <div className="mt-6 grid gap-3 border-t border-white/[.08] pt-5 sm:grid-cols-2">
            <div><p className="text-[9px] uppercase tracking-[.16em] text-white/35">{audience === "driver" ? "Passageiro" : "Motorista"}</p><p className="mt-1 text-sm text-white/80">{audience === "driver" ? ride.rider?.name || "Passageiro MARKA" : ride.driver?.user?.name || "A aguardar atribuição"}</p></div>
            <div><p className="text-[9px] uppercase tracking-[.16em] text-white/35">Serviço</p><p className="mt-1 text-sm text-white/80">{ride.serviceType || "MARKA Mobility"}</p></div>
            {ride.vehicle && <div><p className="text-[9px] uppercase tracking-[.16em] text-white/35">Veículo</p><p className="mt-1 text-sm text-white/80">{[ride.vehicle.make, ride.vehicle.model].filter(Boolean).join(" ") || "Veículo atribuído"}</p></div>}
            {ride.vehicle && <div><p className="text-[9px] uppercase tracking-[.16em] text-white/35">Matrícula</p><p className="mt-1 text-sm text-white/80">{ride.vehicle.plateNumber || ride.vehicle.registrationNumber || "Confirmada na viagem"}</p></div>}
          </div>
          <p className="mt-5 rounded-xl border border-white/[.08] bg-black/20 px-4 py-3 text-[11px] leading-5 text-white/45">Segurança e atenção à estrada têm prioridade. A publicidade é ocultada se o estado da viagem, a localização ou a proximidade do destino não permitirem uma apresentação segura.</p>
          {audience === "driver" && driverAction && <div className="mt-5 border-t border-white/[.08] pt-5"><button type="button" disabled={actionLoading} onClick={() => void performDriverAction()} className="flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#f5d47c] to-[#dca83d] px-5 py-3 text-center text-xs font-bold text-[#17130a] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">{actionLoading ? "A atualizar viagem…" : driverAction.label + " →"}</button>{actionError && <p role="alert" className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/[.05] p-3 text-xs text-rose-100">{actionError}</p>}</div>}
        </div>}
      </div>
      <aside className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-[9px] uppercase tracking-[.22em] text-[#e9bd58]">Experiência MARKA</p><h3 className="mt-2 text-base font-semibold">{audience === "driver" ? "Mais clareza. Menos distração." : "Conforto, transparência e confiança."}</h3><p className="mt-2 text-xs leading-5 text-white/45">{audience === "driver" ? "O conteúdo comercial não interfere com segurança ou pagamento." : "Informação essencial primeiro; conteúdo patrocinado apenas quando elegível."}</p><label className="mt-4 flex cursor-pointer items-center justify-between gap-3 border-t border-white/[.08] pt-4 text-xs text-white/65"><span>Publicidade durante a viagem</span><input type="checkbox" checked={adsEnabled} disabled={!adsPreferenceLoaded} onChange={(event) => updateAdsEnabled(event.target.checked)} className="h-4 w-4 accent-[#e9bd58]" /></label></div>
        {active && <MobilityTripAdSlot context={adContext} audience={audience} onDismiss={(time) => setLastAdDismissedAt(time)} />}
        {active && destinationDistance !== null && <p className="px-1 text-[10px] text-white/30">Distância aproximada ao destino: {destinationDistance < 1000 ? String(Math.round(destinationDistance)) + " m" : (destinationDistance / 1000).toFixed(1) + " km"}</p>}
      </aside>
    </div>
  </section>;
}
