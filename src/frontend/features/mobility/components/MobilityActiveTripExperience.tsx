"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";
import MobilityTripAdSlot from "@/frontend/features/mobility/components/MobilityTripAdSlot";
import MobilityTripMap from "@/frontend/features/mobility/components/MobilityTripMap";
import type { MobilityAdContext } from "@/monetization/ads/ad.types";

type Audience = "rider" | "driver";
type Ride = {
  id: string; reference?: string | null; status: string; serviceType?: string;
  pickupAddress?: string | null; dropoffAddress?: string | null;
  pickupLatitude?: number | string | null; pickupLongitude?: number | string | null;
  dropoffLatitude?: number | string | null; dropoffLongitude?: number | string | null;
  startedAt?: string | null; rider?: { name?: string | null; profile?: { avatarUrl?: string | null } | null } | null;
  driver?: { user?: { name?: string | null } | null; location?: { latitude?: number | string | null; longitude?: number | string | null; lat?: number | string | null; lng?: number | string | null; heading?: number | string | null } | null } | null;
  vehicle?: { make?: string | null; model?: string | null; plateNumber?: string | null; registrationNumber?: string | null } | null;
  metadata?: Record<string, unknown> | null;
};
type RideAction = "ACCEPT" | "DRIVER_ARRIVING" | "DRIVER_ARRIVED" | "START_TRIP" | "BEGIN_TRIP_PROGRESS" | "COMPLETE";
type RideOrchestration = { currentStep?: string | null } | null;
type RidePayload = { ride?: Ride | null; rides?: Ride[]; orchestration?: RideOrchestration; orchestrations?: Array<{ rideId: string; orchestration: RideOrchestration }>; message?: string };
type AvailabilityPayload = { driver?: { status?: string; displayName?: string | null } | null; availability?: { status?: string } | null; status?: string; message?: string };
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
  const router = useRouter();
  const [payload, setPayload] = useState<RidePayload | null>(null);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [adsPreferenceLoaded, setAdsPreferenceLoaded] = useState(false);
  const [lastAdDismissedAt, setLastAdDismissedAt] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [communicationLoading, setCommunicationLoading] = useState(false);
  const [communicationError, setCommunicationError] = useState<string | null>(null);
  const [driverProfileStatus, setDriverProfileStatus] = useState<string | null>(null);
  const [driverAvailability, setDriverAvailability] = useState("OFFLINE");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [financialSetupLoading, setFinancialSetupLoading] = useState(false);
  const [financialSetupMessage, setFinancialSetupMessage] = useState<string | null>(null);
  const [financialSetupError, setFinancialSetupError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "active" | "permission" | "unavailable" | "error">("idle");
  const lastGpsSentAt = useRef(0);
  const organizationId = activeOrganization?.id;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("marka.ads.enabled." + audience);
        if (saved !== null) setAdsEnabled(saved === "true");
      } catch {
        setAdsEnabled(false);
      } finally {
        setAdsPreferenceLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [audience]);

  const updateAdsEnabled = (enabled: boolean) => {
    setAdsEnabled(enabled);
    try { window.localStorage.setItem("marka.ads.enabled." + audience, String(enabled)); }
    catch { setAdsEnabled(false); }
  };

  const refresh = useCallback(async () => {
    if (!organizationId) { setPayload(null); setLoading(false); return; }
    try {
      const endpoint = audience === "driver" ? "/api/mobility/driver/active-ride" : "/api/mobility/rides";
      const response = await fetch(endpoint, { credentials: "include", cache: "no-store", headers: { "X-Organization-Id": organizationId } });
      const data = (await response.json()) as RidePayload;
      if (!response.ok) throw new Error(data.message || "Não foi possível consultar a viagem.");
      setPayload(data); setError(null);
      if (audience === "driver") {
        try {
          const availabilityResponse = await fetch("/api/mobility/driver/availability", { credentials: "include", cache: "no-store", headers: { "X-Organization-Id": organizationId } });
          const availabilityData = (await availabilityResponse.json()) as AvailabilityPayload;
          if (availabilityResponse.ok) {
            setDriverProfileStatus(availabilityData.driver?.status ?? null);
            setDriverAvailability(availabilityData.availability?.status ?? "OFFLINE");
            setAvailabilityError(null);
          } else setAvailabilityError(availabilityData.message || "Não foi possível consultar a disponibilidade.");
        } catch { setAvailabilityError("Não foi possível consultar a disponibilidade."); }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Falha de ligação."); }
    finally { setLoading(false); }
  }, [audience, organizationId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { void refresh(); }, 15000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const driverRides = audience === "driver" ? (payload?.rides ?? (payload?.ride ? [payload.ride] : [])) : [];
  const selectedRide = driverRides.find((item) => item.id === selectedRideId) ?? null;
  const ride = audience === "driver" ? (selectedRide ?? driverRides[0] ?? null) : (payload?.ride ?? null);
  const selectedOrchestration = audience === "driver" && ride
    ? payload?.orchestrations?.find((item) => item.rideId === ride.id)?.orchestration ?? payload?.orchestration
    : payload?.orchestration;
  const hasActiveDriverRides = driverRides.some((item) => ACTIVE.includes(item.status));
  const inProgress = ride?.status === "TRIP_IN_PROGRESS";
  const pickupLatitude = num(ride?.pickupLatitude);
  const pickupLongitude = num(ride?.pickupLongitude);
  const dropoffLatitude = num(ride?.dropoffLatitude);
  const dropoffLongitude = num(ride?.dropoffLongitude);
  const driverLatitude = num(ride?.driver?.location?.latitude ?? ride?.driver?.location?.lat);
  const driverLongitude = num(ride?.driver?.location?.longitude ?? ride?.driver?.location?.lng);
  const pickupPoint = pickupLatitude !== null && pickupLongitude !== null ? { lat: pickupLatitude, lng: pickupLongitude } : null;
  const dropoffPoint = dropoffLatitude !== null && dropoffLongitude !== null ? { lat: dropoffLatitude, lng: dropoffLongitude } : null;
  const estimatedFareMinor = typeof ride?.metadata?.estimatedFareMinor === "string" && /^[0-9]+$/.test(ride.metadata.estimatedFareMinor)
    ? ride.metadata.estimatedFareMinor
    : null;
  const driverHeading = num(ride?.driver?.location?.heading);
  const driverPoint = driverLatitude !== null && driverLongitude !== null ? { lat: driverLatitude, lng: driverLongitude, bearing: driverHeading } : null;
  const startedAt = ride?.startedAt ? new Date(ride.startedAt).getTime() : null;
  const destinationDistance = useMemo(() => {
    if (!ride) return null;
    const targetLat = num(ride.dropoffLatitude), targetLng = num(ride.dropoffLongitude);
    const loc = ride.driver?.location;
    const currentLat = num(loc?.latitude ?? loc?.lat), currentLng = num(loc?.longitude ?? loc?.lng);
    if (targetLat === null || targetLng === null || currentLat === null || currentLng === null) return null;
    return distance(currentLat, currentLng, targetLat, targetLng);
  }, [ride]);

  const pickupDistanceMeters = useMemo(() => {
    if (audience !== "driver" || !ride) return null;
    const targetLat = num(ride.pickupLatitude), targetLng = num(ride.pickupLongitude);
    const loc = ride.driver?.location;
    const currentLat = num(loc?.latitude ?? loc?.lat), currentLng = num(loc?.longitude ?? loc?.lng);
    if (targetLat === null || targetLng === null || currentLat === null || currentLng === null) return null;
    return distance(currentLat, currentLng, targetLat, targetLng);
  }, [audience, ride]);

  const adContext: MobilityAdContext = {
    adsEnabled: adsPreferenceLoaded && adsEnabled, rideStatus: ride?.status, tripStartedAt: startedAt,
    isNearDestination: destinationDistance === null || destinationDistance <= 700,
    isNavigationActive: false, isPaymentFlowActive: !inProgress, isSafetyFlowActive: !inProgress,
    lastAdDismissedAt,
  };
  const active = audience === "driver" ? hasActiveDriverRides : Boolean(ride && ACTIVE.includes(ride.status));
  useEffect(() => {
    if (audience !== "driver" || !organizationId || authLoading || loading) {
      const timer = window.setTimeout(() => setGpsStatus("idle"), 0);
      return () => window.clearTimeout(timer);
    }
    if (driverAvailability !== "AVAILABLE" && !active) {
      const timer = window.setTimeout(() => setGpsStatus("idle"), 0);
      return () => window.clearTimeout(timer);
    }
    if (!navigator.geolocation) {
      const timer = window.setTimeout(() => setGpsStatus("unavailable"), 0);
      return () => window.clearTimeout(timer);
    }

    let disposed = false;
    let lastSentForWatch = 0;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (disposed) return;
        const now = Date.now();
        if (now - lastSentForWatch < 15000 || now - lastGpsSentAt.current < 12000) return;
        lastSentForWatch = now;
        lastGpsSentAt.current = now;
        const coords = position.coords;
        void fetch("/api/mobility/driver/location", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId },
          body: JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracyM: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
            heading: coords.heading == null ? null : coords.heading,
            speedKph: coords.speed == null ? null : coords.speed * 3.6,
          }),
        }).then((response) => {
          if (!disposed) setGpsStatus(response.ok ? "active" : "error");
        }).catch(() => {
          if (!disposed) setGpsStatus("error");
        });
      },
      (geoError) => {
        if (!disposed) setGpsStatus(geoError.code === 1 ? "permission" : "unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => {
      disposed = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [audience, organizationId, authLoading, loading, driverAvailability, active, ride?.id]);
  const driverAction = useMemo(() => {
    if (audience !== "driver") return null;
    const step = selectedOrchestration?.currentStep;
    const actions: Record<string, { action: RideAction; label: string }> = {
      DRIVER_ASSIGNED: { action: "ACCEPT", label: "Aceitar viagem" },
      DRIVER_ACCEPTED: { action: "DRIVER_ARRIVING", label: "Iniciar deslocação para recolha" },
      DRIVER_ARRIVING: { action: "DRIVER_ARRIVED", label: "Confirmar chegada" },
      DRIVER_ARRIVED: { action: "START_TRIP", label: "Iniciar viagem" },
      TRIP_STARTED: { action: "BEGIN_TRIP_PROGRESS", label: "Confirmar passageiro a bordo e iniciar percurso" },
      TRIP_IN_PROGRESS: { action: "COMPLETE", label: "Concluir viagem e fechar pagamento em numerário" },
    };
    return step ? actions[step] ?? null : null;
  }, [audience, selectedOrchestration?.currentStep]);

  const canRejectAssignment = audience === "driver" &&
    ["DRIVER_ASSIGNED", "DRIVER_ACCEPTED", "DRIVER_ARRIVING"].includes(selectedOrchestration?.currentStep ?? "") &&
    ["DRIVER_ASSIGNED", "DRIVER_ARRIVING"].includes(ride?.status ?? "");

  const toggleDriverAvailability = async () => {
    if (!organizationId || availabilityLoading || active) return;
    setAvailabilityLoading(true); setAvailabilityError(null);
    const nextStatus = driverAvailability === "AVAILABLE" ? "OFFLINE" : "AVAILABLE";
    try {
      const response = await fetch("/api/mobility/driver/availability", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId }, body: JSON.stringify({ status: nextStatus }) });
      const data = (await response.json()) as AvailabilityPayload;
      if (!response.ok) throw new Error(data.message || "Não foi possível atualizar a disponibilidade.");
      setDriverAvailability(data.status || nextStatus);
    } catch (e) { setAvailabilityError(e instanceof Error ? e.message : "Falha ao atualizar disponibilidade."); }
    finally { setAvailabilityLoading(false); }
  };

  const openRideConversation = async () => {
    if (!ride || communicationLoading) return;
    setCommunicationLoading(true); setCommunicationError(null);
    try {
      const response = await fetch("/api/comms/threads", {
        method: "POST", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextType: "MOBILITY", contextId: ride.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "A comunicação ainda não está disponível.");
      router.push(`/app/messages?conversationId=${encodeURIComponent(data.thread.id)}`);
    } catch (e) {
      setCommunicationError(e instanceof Error ? e.message : "Não foi possível abrir a conversa.");
    } finally { setCommunicationLoading(false); }
  };

  const prepareCashPayment = async () => {
    if (!ride || !organizationId || financialSetupLoading || !estimatedFareMinor) return;
    setFinancialSetupLoading(true);
    setFinancialSetupError(null);
    setFinancialSetupMessage(null);
    try {
      const response = await fetch("/api/mobility/rides/" + encodeURIComponent(ride.id) + "/financials", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "Idempotency-Key": "marka-rider-" + ride.id + "-cash-payment-v1",
        },
        body: JSON.stringify({ operation: "INITIALIZE", paymentMethod: "CASH" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível preparar o pagamento.");
      setFinancialSetupMessage("Pagamento em numerário preparado. O motorista já pode concluir a viagem.");
    } catch (e) {
      setFinancialSetupError(e instanceof Error ? e.message : "Não foi possível preparar o pagamento.");
    } finally {
      setFinancialSetupLoading(false);
    }
  };

  const performDriverAction = async () => {
    if (!ride || !organizationId || !driverAction || actionLoading) return;
    if (driverAction.action === "COMPLETE" && !estimatedFareMinor) {
      setActionError("A tarifa validada desta viagem não está disponível. A conclusão foi bloqueada.");
      return;
    }
    setActionLoading(true); setActionError(null);
    const actionKey = "marka-driver-" + ride.id + "-" + driverAction.action + "-v1";
    try {
      const response = await fetch("/api/mobility/rides/" + encodeURIComponent(ride.id), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId, "Idempotency-Key": actionKey },
        body: JSON.stringify({
          action: driverAction.action,
          safetyMode: "STANDARD",
          ...(driverAction.action === "COMPLETE" ? {
            finalFareMinor: estimatedFareMinor,
            estimatedFareMinor,
            paymentMethod: "CASH",
            paymentIdempotencyKey: actionKey + ":payment",
            settlementIdempotencyKey: actionKey + ":settlement",
            settlementCompletionIdempotencyKey: actionKey + ":settlement-complete",
          } : {}),
        }),
      });
      const data = (await response.json()) as RidePayload;
      if (!response.ok) throw new Error(data.message || "Não foi possível atualizar o estado da viagem.");
      setPayload(data);
      await refresh();
    } catch (e) { setActionError(e instanceof Error ? e.message : "Falha ao atualizar a viagem."); }
    finally { setActionLoading(false); }
  };

  const performDriverRejection = async () => {
    if (!ride || !organizationId || actionLoading) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      setActionError("Indique o motivo da rejeição.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    const actionKey = "marka-driver-" + ride.id + "-REJECT_ASSIGNMENT-v1";
    try {
      const response = await fetch("/api/mobility/rides/" + encodeURIComponent(ride.id), {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "Idempotency-Key": actionKey,
        },
        body: JSON.stringify({
          action: "REJECT_ASSIGNMENT",
          reason,
          safetyMode: "STANDARD",
        }),
      });
      const data = (await response.json()) as RidePayload;
      if (!response.ok) throw new Error(data.message || "Não foi possível rejeitar a viagem.");
      setPayload(data);
      setRejectionReason("");
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Falha ao rejeitar a viagem.");
    } finally {
      setActionLoading(false);
    }
  };

  if (audience === "rider" && !authLoading && !loading && !error && !active) return null;

  return <section className="overflow-hidden rounded-[28px] border border-white/[.09] bg-[#080B10] text-white shadow-[0_30px_100px_-52px_rgba(0,0,0,.9)]">
    <header className="relative border-b border-white/[.08] px-5 py-6 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(216,179,90,.14),transparent_55%)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[9px] font-semibold uppercase tracking-[.3em] text-[#e9bd58]">{audience === "driver" ? "Espaço do parceiro" : "Acompanhamento da viagem"}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] sm:text-3xl">{audience === "driver" ? "A sua operação, sob controlo." : "A sua viagem, acompanhada."}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">{audience === "driver" ? "Disponibilidade, percurso e ações operacionais num espaço claro e sem distrações." : "Percurso, motorista e informação essencial reunidos num só ecrã."}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-2 text-[9px] uppercase tracking-[.18em] text-white/65"><span className="h-1.5 w-1.5 rounded-full bg-[#e9bd58]" /> Sincronização automática</span>
      </div>
    </header>
    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_.72fr] lg:p-8">
      <div className="min-w-0">
        {authLoading || loading ? <div className="animate-pulse rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-white/45">A sincronizar a sua viagem…</div>
        : error ? <div role="status" className="rounded-2xl border border-rose-300/20 bg-rose-300/[.05] p-5"><p className="text-sm text-rose-100">Não foi possível atualizar a viagem.</p><button onClick={() => { setLoading(true); void refresh(); }} className="mt-3 rounded-full border border-white/15 px-4 py-2 text-xs text-white/75">Tentar novamente</button></div>
        : !ride || !ACTIVE.includes(ride.status) ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6 sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e9bd58]/25 bg-[#e9bd58]/[.07] text-xl text-[#e9bd58]">{audience === "driver" ? "↗" : "⌖"}</div><h3 className="mt-4 text-lg font-semibold">{audience === "driver" ? "Sem viagem atribuída neste momento" : "Ainda não tem uma viagem ativa"}</h3><p className="mt-2 max-w-md text-sm leading-6 text-white/45">{audience === "driver" ? "Quando uma viagem for atribuída à sua conta, os detalhes aparecem aqui automaticamente." : "O estado da viagem aparecerá aqui assim que um pedido estiver ativo."}</p><button onClick={() => { setLoading(true); void refresh(); }} className="mt-5 rounded-full border border-[#e9bd58]/35 px-4 py-2.5 text-xs font-semibold text-[#f0d58e]">Atualizar estado</button></div>
        : <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.055] to-transparent p-5 sm:p-6">
          {pickupPoint && <MobilityTripMap pickup={pickupPoint} dropoff={dropoffPoint} driver={driverPoint}/>}
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.22em] text-white/35">Referência da viagem</p><p className="mt-1 text-lg font-semibold tracking-wide">{ride.reference || ride.id.slice(0, 8).toUpperCase()}</p></div><span className="rounded-full border border-[#e9bd58]/30 bg-[#e9bd58]/[.08] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.12em] text-[#f0d58e]">{STATUS[ride.status] || ride.status.replaceAll("_", " ")}</span></div>
          <div className="mt-6 space-y-0"><div className="flex gap-3 pb-5"><div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-sky-300/60 text-[8px] text-sky-200">●</div><div className="min-w-0"><p className="text-[9px] uppercase tracking-[.18em] text-white/35">Recolha</p><p className="mt-1 break-words text-sm text-white/90">{ride.pickupAddress || "Ponto de recolha registado"}</p></div></div><div className="ml-[9px] h-5 border-l border-dashed border-white/20" /><div className="flex gap-3 pt-3"><div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#e9bd58]/70 text-[8px] text-[#e9bd58]">◆</div><div className="min-w-0"><p className="text-[9px] uppercase tracking-[.18em] text-white/35">Destino</p><p className="mt-1 break-words text-sm text-white/90">{ride.dropoffAddress || "Destino registado no pedido"}</p></div></div></div>
          <div className="mt-6 grid gap-3 border-t border-white/[.08] pt-5 sm:grid-cols-2">
            {audience === "driver" ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#e9bd58]/45 bg-white/[.05]">
                  {ride.rider?.profile?.avatarUrl ? <img src={ride.rider.profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm font-semibold text-[#e9bd58]">{(ride.rider?.name || "P").slice(0,1).toUpperCase()}</div>}
                </div>
                <div><p className="text-[9px] uppercase tracking-[.16em] text-white/35">Passageiro</p><p className="mt-1 text-sm text-white/80">{ride.rider?.name || "Passageiro MARKA"}</p><p className="text-[9px] text-white/35">Avaliação não disponível</p></div>
              </div>
            ) : <div><p className="text-[9px] uppercase tracking-[.16em] text-white/35">Motorista</p><p className="mt-1 text-sm text-white/80">{ride.driver?.user?.name || "A aguardar atribuição"}</p></div>}
            <div><p className="text-[9px] uppercase tracking-[.16em] text-white/35">Serviço</p><p className="mt-1 text-sm text-white/80">{ride.serviceType || "MARKA Mobility"}</p></div>
            {ride.vehicle && <div><p className="text-[9px] uppercase tracking-[.16em] text-white/35">Veículo</p><p className="mt-1 text-sm text-white/80">{[ride.vehicle.make, ride.vehicle.model].filter(Boolean).join(" ") || "Veículo atribuído"}</p></div>}
            {ride.vehicle && <div><p className="text-[9px] uppercase tracking-[.16em] text-white/35">Matrícula</p><p className="mt-1 text-sm text-white/80">{ride.vehicle.plateNumber || ride.vehicle.registrationNumber || "Confirmada na viagem"}</p></div>}
            {audience === "driver" && <div><p className="text-[9px] uppercase tracking-[.16em] text-white/35">Distância à recolha</p><p className="mt-1 text-sm text-white/80">{pickupDistanceMeters === null ? "A obter GPS" : pickupDistanceMeters < 1000 ? Math.round(pickupDistanceMeters) + " m" : (pickupDistanceMeters / 1000).toFixed(1) + " km"}</p></div>}
            {audience === "driver" && <div><p className="text-[9px] uppercase tracking-[.16em] text-white/35">Valor líquido</p><p className="mt-1 text-sm text-white/55">A aguardar cálculo financeiro validado</p></div>}

          </div>
          {["DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "TRIP_STARTED", "TRIP_IN_PROGRESS"].includes(ride.status) && <div className="mt-5"><button type="button" disabled={communicationLoading} onClick={() => void openRideConversation()} className="flex min-h-11 w-full items-center justify-center rounded-full border border-[#e9bd58]/35 bg-[#e9bd58]/[.07] px-4 py-2.5 text-xs font-semibold text-[#f0d58e] transition hover:bg-[#e9bd58]/[.12] disabled:opacity-50">{communicationLoading ? "A abrir conversa…" : "Mensagem e chamada privadas ↗"}</button>{communicationError && <p role="alert" className="mt-2 text-xs text-rose-200">{communicationError}</p>}</div>}
          <p className="mt-5 rounded-xl border border-white/[.08] bg-black/20 px-4 py-3 text-[11px] leading-5 text-white/45">Segurança e atenção à estrada têm prioridade. A publicidade é ocultada se o estado da viagem, a localização ou a proximidade do destino não permitirem uma apresentação segura.</p>
          {audience === "rider" && ride.status === "TRIP_IN_PROGRESS" && <div className="mt-5 border-t border-white/[.08] pt-5">
            <p className="text-xs font-semibold text-white/85">Pagamento da viagem</p>
            <p className="mt-1 text-[11px] leading-5 text-white/45">Tarifa estimada validada pela MARKA: {estimatedFareMinor ? new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA" }).format(Number(estimatedFareMinor) / 100) : "indisponível"}.</p>
            <button type="button" disabled={financialSetupLoading || !estimatedFareMinor} onClick={() => void prepareCashPayment()} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full border border-[#e9bd58]/35 bg-[#e9bd58]/[.07] px-4 py-2.5 text-xs font-semibold text-[#f0d58e] disabled:cursor-not-allowed disabled:opacity-50">{financialSetupLoading ? "A preparar pagamento…" : "Preparar pagamento em numerário"}</button>
            {financialSetupMessage && <p role="status" className="mt-2 text-xs text-emerald-200">{financialSetupMessage}</p>}
            {financialSetupError && <p role="alert" className="mt-2 text-xs text-rose-200">{financialSetupError}</p>}
          </div>}
          {audience === "driver" && (driverAction || canRejectAssignment) && <div className="mt-5 space-y-3 border-t border-white/[.08] pt-5">
            {driverAction && <button type="button" disabled={actionLoading} onClick={() => void performDriverAction()} className="flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#f5d47c] to-[#dca83d] px-5 py-3 text-center text-xs font-bold text-[#17130a] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">{actionLoading ? "A atualizar viagem…" : driverAction.label + " →"}</button>}
            {canRejectAssignment && <div className="rounded-2xl border border-white/[.08] bg-black/15 p-3">
              <label htmlFor="mobility-rejection-reason" className="mb-2 block text-[10px] font-medium text-white/65">Não pode aceitar esta viagem?</label>
              <input id="mobility-rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={240} placeholder="Indique o motivo da rejeição" disabled={actionLoading} className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#e9bd58]/45 disabled:opacity-50" />
              <button type="button" disabled={actionLoading || !rejectionReason.trim()} onClick={() => void performDriverRejection()} className="mt-2 min-h-10 w-full rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-rose-300/35 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-40">{actionLoading ? "A processar…" : "Rejeitar e devolver à procura de motorista"}</button>
            </div>}
            {actionError && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[.05] p-3 text-xs text-rose-100">{actionError}</p>}
          </div>}
        </div>}
      </div>
      <aside className="space-y-3">
        {audience === "driver" && driverRides.length > 0 && <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-semibold uppercase tracking-[.2em] text-[#e9bd58]">Fila operacional</p>
            <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-white/55">{driverRides.length} ativa{driverRides.length === 1 ? "" : "s"}</span>
          </div>
          <div className="mt-3 space-y-2">
            {driverRides.map((item, index) => <button key={item.id} type="button" onClick={() => setSelectedRideId(item.id)} aria-pressed={ride?.id === item.id} className={`w-full rounded-xl border p-3 text-left transition ${ride?.id === item.id ? "border-[#e9bd58]/45 bg-[#e9bd58]/[.08]" : "border-white/[.08] bg-black/10 hover:border-white/20"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-white/85">Viagem {index + 1} · {(item.reference || item.id.slice(0, 8)).toUpperCase()}</span>
                <span className="text-[9px] text-[#e9bd58]">{STATUS[item.status] || item.status.replaceAll("_", " ")}</span>
              </div>
              <p className="mt-2 truncate text-[10px] text-white/55">Recolha: {item.pickupAddress || "Local registado"}</p>
              <p className="mt-1 truncate text-[10px] text-white/35">Destino: {item.dropoffAddress || "Destino registado"}</p>
            </button>)}
          </div>
        </div>}
        {audience === "driver" && <div className="rounded-2xl border border-[#e9bd58]/25 bg-[#e9bd58]/[.045] p-5">
          <p className="text-[9px] font-semibold uppercase tracking-[.2em] text-[#e9bd58]">Estado operacional</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-white">{driverAvailability === "AVAILABLE" ? "Disponível para viagens" : active ? "Em viagem" : "Fora de serviço"}</p><p className="mt-1 text-[10px] text-white/45">{driverProfileStatus === "ACTIVE" ? "Perfil aprovado" : driverProfileStatus ? "Perfil " + driverProfileStatus.toLowerCase().replaceAll("_", " ") : "Perfil de motorista por validar"}</p></div>
            <span className={`h-2.5 w-2.5 rounded-full ${driverAvailability === "AVAILABLE" ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.65)]" : "bg-white/25"}`} />
          </div>
          <button type="button" disabled={availabilityLoading || active || driverProfileStatus !== "ACTIVE"} onClick={() => void toggleDriverAvailability()} className={`mt-4 flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${driverAvailability === "AVAILABLE" ? "border border-white/15 bg-white/[.04] text-white/80 hover:border-rose-300/40 hover:text-rose-100" : "bg-gradient-to-r from-[#f5d47c] to-[#dca83d] text-[#17130a] hover:brightness-105"}`}>{availabilityLoading ? "A atualizar estado…" : active ? "Disponibilidade bloqueada durante a viagem" : driverAvailability === "AVAILABLE" ? "Ficar offline" : "Ficar disponível"}</button>
          {availabilityError && <p role="alert" className="mt-3 text-[11px] leading-5 text-rose-200">{availabilityError}</p>}
          {driverProfileStatus !== "ACTIVE" && <p className="mt-3 text-[10px] leading-4 text-white/40">A disponibilidade só é ativada após aprovação do perfil, da viatura e dos documentos obrigatórios.</p>}
          {driverAvailability === "AVAILABLE" && <p role="status" className="mt-3 text-[10px] leading-4 text-white/45">{gpsStatus === "active" ? "GPS ativo · localização sincronizada" : gpsStatus === "permission" ? "GPS bloqueado · permita a localização no dispositivo" : gpsStatus === "unavailable" ? "GPS indisponível · verifique os serviços de localização" : gpsStatus === "error" ? "GPS sem sincronização · será tentada nova atualização" : "A preparar localização GPS…"}</p>}
        </div>}
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-[9px] uppercase tracking-[.22em] text-[#e9bd58]">Experiência MARKA</p><h3 className="mt-2 text-base font-semibold">{audience === "driver" ? "Mais clareza. Menos distração." : "Conforto, transparência e confiança."}</h3><p className="mt-2 text-xs leading-5 text-white/45">{audience === "driver" ? "O conteúdo comercial não interfere com segurança ou pagamento." : "Informação essencial primeiro; conteúdo patrocinado apenas quando elegível."}</p><label className="mt-4 flex cursor-pointer items-center justify-between gap-3 border-t border-white/[.08] pt-4 text-xs text-white/65"><span>Publicidade durante a viagem</span><input type="checkbox" checked={adsEnabled} disabled={!adsPreferenceLoaded} onChange={(event) => updateAdsEnabled(event.target.checked)} className="h-4 w-4 accent-[#e9bd58]" /></label></div>
        {active && <MobilityTripAdSlot context={adContext} audience={audience} onDismiss={(time) => setLastAdDismissedAt(time)} />}
        {active && destinationDistance !== null && <p className="px-1 text-[10px] text-white/30">Distância aproximada ao destino: {destinationDistance < 1000 ? String(Math.round(destinationDistance)) + " m" : (destinationDistance / 1000).toFixed(1) + " km"}</p>}
      </aside>
    </div>
  </section>;
}
