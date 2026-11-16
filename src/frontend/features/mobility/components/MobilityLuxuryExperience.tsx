"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";
import MobilityLiveMap, { type MobilityMapPoint, type MobilityRoute } from "@/frontend/features/mobility/components/MobilityLiveMap";
import MarkaVehicleIllustration from "@/frontend/features/mobility/components/MarkaVehicleIllustration";
import MarketplaceCallPanel from "@/frontend/features/communications/components/MarketplaceCallPanel";
import {
  BasculanteSVG,
  CanterDynaSVG,
  CarrinhaFechadaSVG,
  PickupHiluxSVG,
  SedanExecutivoSVG,
} from "@/frontend/features/mobility/components/VehicleIcons";

type Group = "EXECUTIVE" | "MOTO" | "CARGO";
type Ride = {
  id: string;
  reference?: string | null;
  status: string;
  serviceType?: string;
  pickupLatitude?: number | string | null;
  pickupLongitude?: number | string | null;
  pickupAddress?: string | null;
  dropoffLatitude?: number | string | null;
  dropoffLongitude?: number | string | null;
  dropoffAddress?: string | null;
  driver?: {
    user?: {
      name?: string | null;
      isIdentityVerified?: boolean;
      rating?: number | null;
      profile?: { avatarUrl?: string | null } | null;
    } | null;
    latitude?: number | null;
    longitude?: number | null;
    location?: { latitude?: number | string | null; longitude?: number | string | null; heading?: number | string | null } | null;
  } | null;
  vehicle?: { make?: string | null; model?: string | null; plateNumber?: string | null; registrationNumber?: string | null } | null;
};
type RideResponse = { ride?: Ride | null; orchestration?: { currentStep?: string | null; recoveryRequired?: boolean } | null; message?: string };
type Quote = { currency: string; totalMinor: string; totalAOA: number };
type Place = { label: string; lat: number; lon: number };

const choices: Record<Group, Array<{ id: string; title: string; detail: string; icon: string }>> = {
  EXECUTIVE: [
    { id: "TAXI", title: "MARKA Black", detail: "Sedan executivo · até 4 passageiros", icon: "sedan" },
    { id: "EXECUTIVE", title: "Executivo", detail: "Conforto premium", icon: "sedan" },
  ],
  MOTO: [{ id: "MOTO_TAXI", title: "Moto", detail: "Moto-táxi · 1 passageiro", icon: "motorcycle" }],
  CARGO: [
    { id: "VAN", title: "Carrinha fechada", detail: "Carga protegida", icon: "van" },
    { id: "PICKUP", title: "Pick-up", detail: "Caixa aberta", icon: "pickup" },
    { id: "MEDIUM_TRUCK", title: "Canter / Dyna", detail: "Camião ligeiro urbano", icon: "canter" },
    { id: "TIPPER_TRUCK", title: "Basculante", detail: "Areia, brita e inertes", icon: "tipper" },
    { id: "HEAVY_TRUCK", title: "Camião pesado", detail: "Plataforma e carga pesada", icon: "heavy" },
  ],
};

const labels: Record<string, string> = {
  REQUESTED: "Pedido recebido",
  SEARCHING: "A procurar motorista",
  MATCHED: "Motorista identificado",
  DRIVER_ASSIGNED: "Motorista atribuído",
  DRIVER_ACCEPTED: "Motorista confirmou",
  DRIVER_ARRIVING: "Motorista a caminho",
  DRIVER_ARRIVED: "Motorista chegou",
  TRIP_STARTED: "Viagem iniciada",
  TRIP_IN_PROGRESS: "Em viagem",
  COMPLETED: "Viagem concluída",
};

const fmt = (value: number) => new Intl.NumberFormat("pt-AO", {
  style: "currency",
  currency: "AOA",
  maximumFractionDigits: 0,
}).format(value);

function VehicleArt({ kind }: { kind: string }) {
  const className = "h-12 w-28";
  if (kind === "sedan") return <SedanExecutivoSVG className={className} />;
  if (kind === "pickup") return <PickupHiluxSVG className={className} />;
  if (kind === "canter") return <CanterDynaSVG className={className} />;
  if (kind === "van") return <CarrinhaFechadaSVG className={className} />;
  if (kind === "tipper") return <BasculanteSVG className={className} />;
  return <MarkaVehicleIllustration kind={kind} className={className} />;
}

export default function MobilityLuxuryExperience() {
  const { user, activeOrganization } = useAuth();
  const router = useRouter();
  const organizationId = activeOrganization?.id;

  const [drawer, setDrawer] = useState(false);
  const [group, setGroup] = useState<Group>("EXECUTIVE");
  const [serviceType, setServiceType] = useState("TAXI");
  const [origin, setOrigin] = useState<MobilityMapPoint | null>(null);
  const [destination, setDestination] = useState<MobilityMapPoint | null>(null);
  const [route, setRoute] = useState<MobilityRoute | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [fareStatus, setFareStatus] = useState("NO_ROUTE");
  const [fareByService, setFareByService] = useState<Record<string, Quote>>({});
  const [passengers, setPassengers] = useState(1);
  const [safety, setSafety] = useState("STANDARD");
  const [destinationText, setDestinationText] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [rideMessage, setRideMessage] = useState<string | null>(null);
  const [communicationLoading, setCommunicationLoading] = useState(false);
  const [communicationError, setCommunicationError] = useState<string | null>(null);
  const [communicationThreadId, setCommunicationThreadId] = useState<string | null>(null);
  const [callPanelOpen, setCallPanelOpen] = useState(false);
  const [driverEta, setDriverEta] = useState<number | null>(null);

  const driver = useMemo(() => {
    const lat = Number(ride?.driver?.location?.latitude ?? ride?.driver?.latitude);
    const lon = Number(ride?.driver?.location?.longitude ?? ride?.driver?.longitude);
    const bearing = Number(ride?.driver?.location?.heading);
    return Number.isFinite(lat) && Number.isFinite(lon)
      ? { lat, lon, bearing: Number.isFinite(bearing) ? bearing : null }
      : null;
  }, [ride]);

  const active = Boolean(ride && !["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED", "NO_DRIVER_FOUND", "FAILED"].includes(ride.status));
  const assigned = Boolean(ride?.driver);
  const list = choices[group];
  const name = user?.profile?.displayName || user?.name || "Utilizador MARKA";
  const etaInput = useRef<{ driver: typeof driver; origin: MobilityMapPoint | null; serviceType: string }>({
    driver: null,
    origin: null,
    serviceType: "TAXI",
  });
  etaInput.current = { driver, origin, serviceType: ride?.serviceType || serviceType };

  const onRoute = useCallback((value: MobilityRoute | null) => {
    setRoute(value);
    setQuote(value?.fare ?? null);
    setFareStatus(value?.fareStatus ?? "NO_ROUTE");
    if (value?.fare) {
      setFareByService((current) => ({ ...current, [serviceType]: value.fare as Quote }));
    }
  }, [serviceType]);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/mobility/rides", {
      credentials: "include",
      cache: "no-store",
      headers: { "X-Organization-Id": organizationId || "" },
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data: RideResponse | null) => {
        if (!mounted || !data?.ride) return;
        setRide(data.ride);
        const ridePickupLat = data.ride.pickupLatitude == null ? Number.NaN : Number(data.ride.pickupLatitude);
        const ridePickupLon = data.ride.pickupLongitude == null ? Number.NaN : Number(data.ride.pickupLongitude);
        const rideDropoffLat = data.ride.dropoffLatitude == null ? Number.NaN : Number(data.ride.dropoffLatitude);
        const rideDropoffLon = data.ride.dropoffLongitude == null ? Number.NaN : Number(data.ride.dropoffLongitude);
        if (Number.isFinite(ridePickupLat) && Number.isFinite(ridePickupLon)) {
          setOrigin({ lat: ridePickupLat, lon: ridePickupLon, label: data.ride.pickupAddress || "Local de recolha" });
        }
        if (Number.isFinite(rideDropoffLat) && Number.isFinite(rideDropoffLon)) {
          setDestination({ lat: rideDropoffLat, lon: rideDropoffLon, label: data.ride.dropoffAddress || "Destino" });
          setDestinationText(data.ride.dropoffAddress || "");
        }
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [organizationId]);

  useEffect(() => {
    if (!ride || ["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED", "NO_DRIVER_FOUND", "FAILED"].includes(ride.status)) return;
    let mounted = true;
    const poll = async () => {
      try {
        const response = await fetch("/api/mobility/rides", {
          credentials: "include",
          cache: "no-store",
          headers: { "X-Organization-Id": organizationId || "" },
        });
        if (!response.ok) return;
        const data = await response.json() as RideResponse;
        if (mounted && data.ride) setRide(data.ride);
      } catch {
        // Retry on the next polling cycle.
      }
    };
    const timer = window.setInterval(() => void poll(), 7000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [ride?.id, ride?.status, organizationId]);

  useEffect(() => {
    const value = destinationText.trim();
    if (value.length < 3 || active) {
      setSuggestions([]);
      setSearchBusy(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchBusy(true);
      let localPlaces: Place[] = [];
      try {
        try {
          const localResponse = await fetch("/api/mobility/places/search?q=" + encodeURIComponent(value), {
            signal: controller.signal,
            credentials: "same-origin",
            cache: "no-store",
          });
          if (localResponse.ok) {
            const localData = await localResponse.json() as { places?: Place[] };
            localPlaces = (localData.places ?? []).filter((place) =>
              Number.isFinite(place.lat) && Number.isFinite(place.lon)
              && place.lat >= -90 && place.lat <= 90 && place.lon >= -180 && place.lon <= 180,
            );
          }
        } catch {
          if (controller.signal.aborted) return;
        }

        const url = new URL("https://photon.komoot.io/api/");
        url.searchParams.set("q", value);
        url.searchParams.set("limit", "8");
        url.searchParams.set("lang", "pt");
        url.searchParams.set("lat", "-8.83");
        url.searchParams.set("lon", "13.23");
        url.searchParams.set("zoom", "7");
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Pesquisa indisponível");
        const data = await response.json() as {
          features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> }>;
        };
        const remotePlaces = (data.features ?? []).flatMap((feature) => {
          const coordinates = feature.geometry?.coordinates;
          const properties = feature.properties ?? {};
          if (!coordinates || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return [];
          const country = typeof properties.country === "string" ? properties.country : "";
          if (country && !/angola/i.test(country)) return [];
          const label = [properties.name, properties.street, properties.district, properties.city, properties.state, country]
            .filter((part): part is string => typeof part === "string" && part.length > 0)
            .filter((part, index, all) => all.indexOf(part) === index)
            .join(", ");
          return label ? [{ label, lon: coordinates[0], lat: coordinates[1] }] : [];
        });
        const seen = new Set(localPlaces.map((place) => place.label.toLocaleLowerCase("pt-AO")));
        setSuggestions([...localPlaces, ...remotePlaces.filter((place) => !seen.has(place.label.toLocaleLowerCase("pt-AO")))].slice(0, 6));
      } catch {
        if (!controller.signal.aborted) setSuggestions(localPlaces.slice(0, 6));
      } finally {
        if (!controller.signal.aborted) setSearchBusy(false);
      }
    }, 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      setSearchBusy(false);
    };
  }, [destinationText, active]);

  useEffect(() => {
    if (!active || !assigned) {
      setDriverEta(null);
      return;
    }
    let mounted = true;
    const updateEta = async () => {
      const current = etaInput.current;
      if (!current.driver || !current.origin) return;
      try {
        const query = new URLSearchParams({
          originLat: String(current.driver.lat),
          originLng: String(current.driver.lon),
          destinationLat: String(current.origin.lat),
          destinationLng: String(current.origin.lon),
          serviceType: current.serviceType,
        });
        const response = await fetch("/api/mobility/routing/geometry?" + query.toString(), {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json() as { route?: { durationSeconds?: number } };
        if (mounted && Number.isFinite(data.route?.durationSeconds)) {
          setDriverEta(Math.max(1, Math.ceil(Number(data.route?.durationSeconds) / 60)));
        }
      } catch {
        // Keep the last confirmed ETA; do not invent a replacement.
      }
    };
    void updateEta();
    const timer = window.setInterval(() => void updateEta(), 30000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [ride?.id, active, assigned]);

  const changeGroup = (next: Group) => {
    setGroup(next);
    setServiceType(choices[next][0].id);
    setQuote(null);
    setError(null);
  };

  const chooseDestination = (place: Place) => {
    setDestination(place);
    setDestinationText(place.label);
    setSuggestions([]);
    setQuote(null);
    setError(null);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setError("Este dispositivo não disponibiliza GPS.");
      return;
    }
    setGpsBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          label: "A minha localização GPS",
        });
        setGpsBusy(false);
      },
      (geoError) => {
        setError(geoError.code === geoError.PERMISSION_DENIED
          ? "Permita o acesso à localização nas definições do dispositivo."
          : "Não foi possível obter a localização GPS.");
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    );
  };

  async function ensureRideThread(): Promise<string> {
    if (!ride) throw new Error("Não existe uma viagem ativa.");
    if (communicationThreadId) return communicationThreadId;
    const response = await fetch("/api/comms/threads", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contextType: "MOBILITY", contextId: ride.id }),
    });
    const data = await response.json() as { thread?: { id: string }; message?: string };
    if (!response.ok || !data.thread?.id) throw new Error(data.message || "A comunicação ainda não está disponível.");
    setCommunicationThreadId(data.thread.id);
    return data.thread.id;
  }

  async function openRideConversation() {
    if (!ride || communicationLoading) return;
    setCommunicationLoading(true);
    setCommunicationError(null);
    try {
      const threadId = await ensureRideThread();
      router.push("/app/messages?conversationId=" + encodeURIComponent(threadId));
    } catch (communicationFailure) {
      setCommunicationError(communicationFailure instanceof Error ? communicationFailure.message : "Não foi possível abrir a conversa.");
    } finally {
      setCommunicationLoading(false);
    }
  }

  async function openRideCall() {
    if (!ride || communicationLoading) return;
    setCommunicationLoading(true);
    setCommunicationError(null);
    try {
      await ensureRideThread();
      setCallPanelOpen(true);
    } catch (communicationFailure) {
      setCommunicationError(communicationFailure instanceof Error ? communicationFailure.message : "Não foi possível preparar a chamada.");
    } finally {
      setCommunicationLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!organizationId) {
      setError("Selecione uma organização ativa.");
      return;
    }
    if (!origin || !destination || !route) {
      setError("Defina a partida e o destino e aguarde o cálculo da rota.");
      return;
    }
    if (!quote) {
      setError("A tarifa desta categoria ainda não está configurada. Não vamos apresentar um preço inventado.");
      return;
    }
    setCreating(true);
    const payload = {
      serviceType,
      passengerCount: serviceType === "MOTO_TAXI" ? 1 : passengers,
      currency: "AOA",
      pickupLatitude: origin.lat,
      pickupLongitude: origin.lon,
      pickupAddress: origin.label,
      dropoffLatitude: destination.lat,
      dropoffLongitude: destination.lon,
      dropoffAddress: destination.label,
      safetyMode: safety,
      metadata: {
        requestSource: "MARKA_MOBILITY_LUXURY_APP",
        quotedFareMinor: quote.totalMinor,
        estimatedDistanceMeters: route.distanceMeters,
        estimatedDurationSeconds: route.durationSeconds,
      },
    };
    try {
      const response = await fetch("/api/mobility/rides", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "marka-ride-" + crypto.randomUUID(),
          "X-Organization-Id": organizationId,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as RideResponse;
      if (!response.ok || !data.ride) throw new Error(data.message || "Não foi possível registar o pedido.");
      setRide(data.ride);
      setCommunicationThreadId(null);
      setCallPanelOpen(false);
      setCommunicationError(null);
      setRideMessage(data.orchestration?.recoveryRequired
        ? "Pedido registado; estamos a recuperar uma etapa operacional."
        : "Pedido enviado aos motoristas elegíveis.");
    } catch (requestFailure) {
      setError(requestFailure instanceof Error ? requestFailure.message : "Falha ao criar o pedido.");
    } finally {
      setCreating(false);
    }
  }

  const driverRating = Number(ride?.driver?.user?.rating);
  const driverName = ride?.driver?.user?.name || "Motorista MARKA";
  const driverAvatar = ride?.driver?.user?.profile?.avatarUrl;
  const vehicleName = [ride?.vehicle?.make, ride?.vehicle?.model].filter(Boolean).join(" ") || "Viatura atribuída";
  const plate = ride?.vehicle?.plateNumber || ride?.vehicle?.registrationNumber || "Matrícula a confirmar";

  return (
    <main className="fixed inset-0 z-40 h-[100dvh] overflow-hidden bg-[#09090B] text-white">
      <MobilityLiveMap
        onRouteChange={onRoute}
        serviceType={serviceType}
        driverPoint={driver}
        originPoint={origin}
        destinationPoint={destination}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))] sm:px-6">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Abrir menu"
          className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-amber-500/20 bg-zinc-950/80 text-lg shadow-xl backdrop-blur-xl"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div className="rounded-full border border-white/10 bg-[#09090B]/65 px-3 py-2 text-center backdrop-blur-xl">
          <p className="text-[10px] font-black tracking-[.24em]">MARKA <span className="text-[#E5B84B]">MOBILITY</span></p>
          <p className="mt-0.5 text-[8px] tracking-[.18em] text-white/40">ANGOLA · PREMIUM MOBILITY</p>
        </div>
        <Link
          href="/app/account"
          aria-label="Abrir perfil"
          className="pointer-events-auto relative grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-[#E5B84B]/65 bg-[#141417] shadow-xl"
        >
          {user?.profile?.avatarUrl
            ? <img src={user.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            : <span className="text-sm font-bold text-[#E5B84B]">{name.slice(0, 1).toUpperCase()}</span>}
          {user?.isIdentityVerified && <span className="absolute bottom-0 right-0 grid h-4 w-4 place-items-center rounded-full border-2 border-[#09090B] bg-[#E5B84B] text-[8px] font-black text-[#09090B]">✓</span>}
        </Link>
      </header>

      {drawer && (
        <div className="absolute inset-0 z-50">
          <button type="button" aria-label="Fechar menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col border-r border-white/10 bg-[#101013] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-[.2em]">MARKA <span className="text-[#E5B84B]">MOBILITY</span></span>
              <button type="button" onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/[.06]" aria-label="Fechar">×</button>
            </div>
            <div className="mt-9 flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#E5B84B] bg-[#25252A]">
                {user?.profile?.avatarUrl
                  ? <img src={user.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  : <div className="grid h-full w-full place-items-center text-lg font-semibold text-[#E5B84B]">{name.slice(0, 1).toUpperCase()}</div>}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="mt-1 text-[10px] text-white/45">{user?.isIdentityVerified ? "✓ Identidade verificada" : "Conta MARKA"}</p>
              </div>
            </div>
            <nav className="mt-9 space-y-1 text-sm">
              <Link onClick={() => setDrawer(false)} href="/app/orders" className="flex min-h-12 items-center rounded-xl px-3 text-white/80 hover:bg-white/[.06]">⌁ <span className="ml-3">Histórico de viagens</span></Link>
              <Link onClick={() => setDrawer(false)} href="/app/wallet" className="flex min-h-12 items-center rounded-xl px-3 text-white/80 hover:bg-white/[.06]">◈ <span className="ml-3">Carteira MARKA</span></Link>
              <Link onClick={() => setDrawer(false)} href="/app/compliance" className="flex min-h-12 items-center rounded-xl px-3 text-white/80 hover:bg-white/[.06]">⬡ <span className="ml-3">Segurança e conformidade</span></Link>
              <Link onClick={() => setDrawer(false)} href="/app/account" className="flex min-h-12 items-center rounded-xl px-3 text-white/80 hover:bg-white/[.06]">◉ <span className="ml-3">Perfil e definições</span></Link>
            </nav>
            <div className="mt-auto rounded-2xl border border-[#E5B84B]/30 bg-[#E5B84B]/[.07] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#E5B84B]">Alternar modo</p>
              <p className="mt-2 text-sm font-semibold">Modo Motorista</p>
              <p className="mt-1 text-[10px] leading-4 text-white/45">Receba pedidos e acompanhe as recolhas.</p>
              <Link href="/app/driver" className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-[#E5B84B] text-xs font-bold text-[#17130A]">Entrar no modo motorista →</Link>
            </div>
            <p className="mt-5 text-[9px] text-white/25">Powered By Magestade Pura Digital</p>
          </aside>
        </div>
      )}

      <form
        onSubmit={submit}
        className="absolute inset-x-0 bottom-0 z-20 mx-auto max-h-[72dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-[30px] border border-white/10 bg-[#141417]/[.97] px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-25px_90px_rgba(0,0,0,.62)] backdrop-blur-2xl sm:bottom-5 sm:rounded-[30px] sm:px-6"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

        {active ? (
          <section className="pb-3" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#E5B84B]">Viagem em tempo real</p>
              <span className="rounded-full border border-[#E5B84B]/25 bg-[#E5B84B]/10 px-3 py-1.5 text-[9px] text-[#E5B84B]">{labels[ride?.status || ""] || ride?.status}</span>
            </div>
            {!assigned ? (
              <div className="mt-4 flex items-center gap-4 rounded-2xl bg-black/25 p-4">
                <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#E5B84B]/35 bg-[#E5B84B]/10">
                  <span className="absolute inset-0 animate-ping rounded-full border border-[#E5B84B]/50" />
                  <span className="text-xl text-[#E5B84B]">⌖</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">A procurar motorista</p>
                  <p className="mt-1 text-[10px] text-white/45">O pedido está a ser enviado aos motoristas elegíveis.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-2xl border border-[#E5B84B]/20 bg-black/25 p-4">
                  <p className="text-base font-semibold tracking-tight">
                    {driverEta !== null ? "O seu motorista chega em " + driverEta + " min" : "O seu motorista está a caminho"}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#E5B84B] bg-[#25252A]">
                      {driverAvatar
                        ? <img src={driverAvatar} alt="" className="h-full w-full object-cover" />
                        : <div className="grid h-full place-items-center text-lg font-bold text-[#E5B84B]">{driverName.slice(0, 1).toUpperCase()}</div>}
                      {ride?.driver?.user?.isIdentityVerified && <span className="absolute bottom-0 right-0 grid h-4 w-4 place-items-center rounded-full border-2 border-[#09090B] bg-[#E5B84B] text-[8px] font-black text-[#09090B]">✓</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{driverName}</p>
                      <p className="mt-1 text-[10px] text-white/45">{vehicleName}</p>
                      <p className="mt-1 text-[10px] font-semibold tracking-[.12em] text-[#E5B84B]">{plate}</p>
                    </div>
                    <div className="text-right">
                      {Number.isFinite(driverRating) && driverRating > 0
                        ? <p className="text-xs font-bold text-[#E5B84B]">★ {driverRating.toFixed(2)}</p>
                        : <p className="text-[9px] text-white/35">Motorista</p>}
                      <p className="mt-1 text-[8px] text-white/30">{ride?.driver?.user?.isIdentityVerified ? "Verificado" : "Atribuído"}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void openRideCall()}
                    disabled={communicationLoading}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E5B84B]/35 bg-[#E5B84B]/[.08] text-xs font-semibold text-[#E5B84B] disabled:opacity-50"
                  >
                    <span aria-hidden="true">☎</span> Ligar
                  </button>
                  <button
                    type="button"
                    onClick={() => void openRideConversation()}
                    disabled={communicationLoading}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] text-xs font-semibold text-white/85 disabled:opacity-50"
                  >
                    <span aria-hidden="true">▤</span> Mensagem
                  </button>
                </div>
                {callPanelOpen && communicationThreadId && (
                  <div className="mt-3 rounded-2xl border border-[#E5B84B]/20 bg-black/25 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3"><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#E5B84B]">Chamada segura MARKA</p><button type="button" onClick={() => setCallPanelOpen(false)} className="text-xs text-white/50">Fechar</button></div>
                    <MarketplaceCallPanel threadId={communicationThreadId} />
                  </div>
                )}
              </>
            )}
            {rideMessage && <p className="mt-3 text-[10px] text-white/45">{rideMessage}</p>}
            {communicationError && <p role="alert" className="mt-2 text-[10px] text-rose-200">{communicationError}</p>}
            <Link href="/app/driver" className="mt-4 inline-flex text-[10px] text-[#E5B84B] underline">Acompanhar operações →</Link>
          </section>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#E5B84B]">Reserve a sua deslocação</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">Para onde vamos?</h1>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] text-white/40">AOA · Kz</span>
            </div>

            <div role="tablist" aria-label="Tipo de serviço" className="mt-4 grid grid-cols-3 gap-2">
              {([
                { id: "EXECUTIVE", label: "Executivo" },
                { id: "MOTO", label: "Moto" },
                { id: "CARGO", label: "Carga" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={group === tab.id}
                  onClick={() => changeGroup(tab.id)}
                  className={"min-h-10 rounded-xl border text-[11px] font-semibold " + (group === tab.id
                    ? "border-[#E5B84B]/60 bg-[#E5B84B]/10 text-[#E5B84B]"
                    : "border-white/10 bg-white/[.025] text-white/50")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-white/[.09] bg-black/25 p-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={locateMe}
                  disabled={gpsBusy}
                  aria-label="Definir partida pela localização GPS"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#E5B84B]/30 bg-[#E5B84B]/10 text-lg text-[#E5B84B] disabled:opacity-50"
                >
                  {gpsBusy ? "…" : "⌖"}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] uppercase tracking-[.16em] text-white/35">Destino</p>
                  <input
                    value={destinationText}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDestinationText(value);
                      if (destination && value !== destination.label) {
                        setDestination(null);
                        setRoute(null);
                        setQuote(null);
                        setFareByService({});
                      }
                    }}
                    placeholder="Para onde vamos?"
                    aria-label="Pesquisar destino em Angola"
                    autoComplete="off"
                    className="h-8 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                  />
                </div>
                {searchBusy && <span className="pr-2 text-[9px] text-white/35">A pesquisar…</span>}
              </div>
              {suggestions.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#101013]">
                  {suggestions.map((place, index) => (
                    <button
                      key={place.label + index}
                      type="button"
                      onClick={() => chooseDestination(place)}
                      className="flex min-h-11 w-full items-center gap-3 border-b border-white/[.06] px-3 text-left text-xs text-white/80 last:border-0 hover:bg-white/[.05]"
                    >
                      <span className="text-[#E5B84B]">⌖</span>
                      <span className="line-clamp-2">{place.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/[.08] bg-black/20 p-3">
                <p className="text-[8px] uppercase tracking-[.15em] text-white/35">Partida</p>
                <p className="mt-1 line-clamp-2 text-[10px] text-white/80">{origin?.label || "Defina pelo GPS"}</p>
              </div>
              <div className="rounded-xl border border-white/[.08] bg-black/20 p-3">
                <p className="text-[8px] uppercase tracking-[.15em] text-white/35">Destino selecionado</p>
                <p className="mt-1 line-clamp-2 text-[10px] text-white/80">{destination?.label || "Pesquise acima"}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {list.map((item) => {
                const itemQuote = item.id === serviceType ? quote : fareByService[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setServiceType(item.id);
                      setQuote(fareByService[item.id] ?? null);
                      setError(null);
                    }}
                    aria-pressed={serviceType === item.id}
                    className={"flex min-w-[154px] flex-col items-center rounded-2xl border p-3 text-center transition " + (serviceType === item.id
                      ? "border-[#E5B84B]/55 bg-[#E5B84B]/[.08]"
                      : "border-white/[.08] bg-black/15")}
                  >
                    <VehicleArt kind={item.icon} />
                    <span className="mt-2 text-[11px] font-semibold">{item.title}</span>
                    <span className="mt-1 min-h-7 text-[9px] leading-4 text-white/40">{item.detail}</span>
                    <span className="mt-2 text-[9px] text-white/55">
                      {route ? Math.max(1, Math.round(route.durationSeconds / 60)) + " min de viagem" : "Tempo após rota"}
                    </span>
                    <span className="mt-1 text-xs font-bold text-[#E5B84B]">
                      {itemQuote ? fmt(itemQuote.totalAOA) : item.id === serviceType && fareStatus === "TARIFF_NOT_CONFIGURED" ? "Tarifa pendente" : "Calcular preço"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/[.08] bg-black/20 px-3 py-3">
              <div>
                <p className="text-[8px] uppercase tracking-[.16em] text-white/35">Distância · duração rodoviária</p>
                <p className="mt-1 text-xs font-semibold">{route
                  ? (route.distanceMeters / 1000).toFixed(1) + " km · " + Math.max(1, Math.round(route.durationSeconds / 60)) + " min"
                  : "A aguardar rota OSRM"}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] uppercase tracking-[.16em] text-white/35">Preço estimado</p>
                <p className="mt-1 text-sm font-bold text-[#E5B84B]">{quote ? fmt(quote.totalAOA) : fareStatus === "TARIFF_NOT_CONFIGURED" ? "Tarifa pendente" : "—"}</p>
              </div>
            </div>

            {group !== "MOTO" && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <label htmlFor="marka-passengers" className="text-[10px] text-white/55">{group === "CARGO" ? "Unidades / capacidade solicitada" : "Passageiros"}</label>
                <input
                  id="marka-passengers"
                  type="number"
                  min={1}
                  max={group === "CARGO" ? 100 : 4}
                  value={passengers}
                  onChange={(event) => setPassengers(Math.max(1, Math.min(group === "CARGO" ? 100 : 4, Number(event.target.value) || 1)))}
                  className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-center text-xs text-white"
                />
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <label htmlFor="marka-safety" className="text-[10px] text-white/50">Proteção da viagem</label>
              <select
                id="marka-safety"
                value={safety}
                onChange={(event) => setSafety(event.target.value)}
                className="rounded-lg border border-white/10 bg-[#09090B] px-3 py-2 text-[10px] text-white"
              >
                <option value="STANDARD">Padrão</option>
                <option value="TRUSTED">Contacto de confiança</option>
                <option value="CHILD">Menor · reforçada</option>
              </select>
            </div>

            {error && <p role="alert" className="mt-3 rounded-lg border border-rose-300/20 bg-rose-300/[.05] p-3 text-[10px] text-rose-100">{error}</p>}

            <button
              type="submit"
              disabled={!route || !quote || creating}
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#F3D27A] via-[#E5B84B] to-[#C99632] px-4 text-xs font-extrabold text-[#09090B] shadow-[0_8px_26px_rgba(229,184,75,.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {creating ? "A enviar pedido…" : "Confirmar MARKA Black"}
            </button>
            <p className="mt-2 text-center text-[8px] text-white/30">A tarifa é calculada pela tabela MARKA e confirmada no servidor. Moeda: AOA (Kz).</p>
          </>
        )}
      </form>
    </main>
  );
}
