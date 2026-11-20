"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";
import MobilityLiveMap, { type MobilityMapPoint, type MobilityRoute, type MobilityRouteStatus } from "@/frontend/features/mobility/components/MobilityLiveMap";
import MobilityServiceTabs from "@/frontend/features/mobility/components/MobilityServiceTabs";
import MarketplaceCallPanel from "@/frontend/features/communications/components/MarketplaceCallPanel";

type Group = "EXECUTIVE" | "MOTO";
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
  metadata?: { estimatedFareMinor?: string | null } | null;
};
type RideResponse = { ride?: Ride | null; orchestration?: { currentStep?: string | null; recoveryRequired?: boolean } | null; recoveryRequired?: boolean; pricing?: { finalFareMinor?: string; promotionApplied?: boolean; promotionDiscountMinor?: string } | null; message?: string };
type Quote = { currency: string; totalMinor: string; totalAOA: number };
type Place = { label: string; lat: number; lon: number };

async function searchPlacesInAngola(value: string, signal: AbortSignal): Promise<Place[]> {
  const localRequest = fetch("/api/mobility/places/search?q=" + encodeURIComponent(value) + "&country=AO", {
    signal,
    credentials: "same-origin",
    cache: "no-store",
  }).then(async (response) => {
    if (!response.ok) return [] as Place[];
    const data = await response.json() as { places?: Place[] };
    return (data.places ?? []).filter((place) =>
      Number.isFinite(place.lat) && Number.isFinite(place.lon)
      && place.lat >= -90 && place.lat <= 90 && place.lon >= -180 && place.lon <= 180,
    );
  }).catch(() => [] as Place[]);

  const remoteRequest = (async () => {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", value + ", Angola");
    url.searchParams.set("limit", "8");
    url.searchParams.set("lang", "pt");
    const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Pesquisa externa indisponível");
    const data = await response.json() as {
      features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> }>;
    };
    return (data.features ?? []).flatMap((feature) => {
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
  })().catch(() => [] as Place[]);

  const [localPlaces, remotePlaces] = await Promise.all([localRequest, remoteRequest]);
  const seen = new Set(localPlaces.map((place) => place.label.toLocaleLowerCase("pt-AO")));
  return [...localPlaces, ...remotePlaces.filter((place) =>
    !seen.has(place.label.toLocaleLowerCase("pt-AO")),
  )].slice(0, 6);
}

const choices: Record<Group, Array<{ id: string; title: string; detail: string; icon: string }>> = {
  EXECUTIVE: [
    { id: "TAXI", title: "Táxi normal", detail: "Viatura ligeira · até 4 passageiros", icon: "sedan" },
  ],
  MOTO: [{ id: "MOTO_TAXI", title: "Moto", detail: "Moto-táxi · 1 passageiro", icon: "motorcycle" }],
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


export default function MobilityLuxuryExperience() {
  const { user, activeOrganization } = useAuth();
  const router = useRouter();
  const organizationId = activeOrganization?.id;

  const [drawer, setDrawer] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [group, setGroup] = useState<Group>("EXECUTIVE");
  const [serviceType, setServiceType] = useState("TAXI");
  const [origin, setOrigin] = useState<MobilityMapPoint | null>(null);
  const [originText, setOriginText] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<Place[]>([]);
  const [originSearchBusy, setOriginSearchBusy] = useState(false);
  const [destination, setDestination] = useState<MobilityMapPoint | null>(null);
  const [route, setRoute] = useState<MobilityRoute | null>(null);
  const [routeStatus, setRouteStatus] = useState<MobilityRouteStatus>({ state: "idle", message: "Defina a partida e o destino." });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [fareStatus, setFareStatus] = useState("NO_ROUTE");
  const [fareByService, setFareByService] = useState<Record<string, Quote | null>>({});
  const [passengers, setPassengers] = useState<number | "">("");
  const [safety, setSafety] = useState("STANDARD");
  const [destinationText, setDestinationText] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [retryingRide, setRetryingRide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [confirmedFareMinor, setConfirmedFareMinor] = useState<string | null>(null);
  const [rideMessage, setRideMessage] = useState<string | null>(null);
  const [communicationLoading, setCommunicationLoading] = useState(false);
  const [communicationError, setCommunicationError] = useState<string | null>(null);
  const [communicationThreadId, setCommunicationThreadId] = useState<string | null>(null);
  const [callPanelOpen, setCallPanelOpen] = useState(false);
  const [driverEta, setDriverEta] = useState<{ rideId: string; minutes: number } | null>(null);
  const [driverApproachGeometry, setDriverApproachGeometry] = useState<{ rideId: string; geometry: MobilityRoute["geometry"] } | null>(null);
  const recoveryAttemptCountRef = useRef<Map<string, number>>(new Map());
  const recoveryNextAttemptAtRef = useRef<Map<string, number>>(new Map());
  const recoveryInFlightRef = useRef<Set<string>>(new Set());

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
  const serviceTypes = list.map((item) => item.id).join(",");
  const name = user?.profile?.displayName || user?.name || "Utilizador MARKA";
  const etaInput = useRef<{ driver: typeof driver; origin: MobilityMapPoint | null; serviceType: string }>({
    driver: null,
    origin: null,
    serviceType: "TAXI",
  });
  useEffect(() => {
    etaInput.current = { driver, origin, serviceType: ride?.serviceType || serviceType };
  }, [driver, origin, ride?.serviceType, serviceType]);

  const visibleDriverEta = active && assigned && driverEta && driverEta.rideId === ride?.id ? driverEta.minutes : null;
  const visibleDriverApproachGeometry = active && assigned && driverApproachGeometry && driverApproachGeometry.rideId === ride?.id
    ? driverApproachGeometry.geometry
    : null;

  const onRouteStatus = useCallback((value: MobilityRouteStatus) => setRouteStatus(value), []);

  const onRoute = useCallback((value: MobilityRoute | null) => {
    setRoute(value);
    const fares = value?.fares ?? (value?.fare ? { [serviceType]: value.fare } : {});
    setFareByService(fares);
    const selectedFare = fares[serviceType] ?? value?.fare ?? null;
    setQuote(selectedFare);
    setFareStatus(selectedFare ? "AVAILABLE" : value?.fareStatus ?? "NO_ROUTE");
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
        setConfirmedFareMinor(typeof data.ride.metadata?.estimatedFareMinor === "string" ? data.ride.metadata.estimatedFareMinor : null);
        if (data.ride.status === "NO_DRIVER_FOUND") {
          setRideMessage("Não encontrámos motoristas disponíveis para esta solicitação. Pode ajustar o pedido ou tentar novamente mais tarde.");
        }
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
        if (!mounted || !data.ride) return;
        setRide(data.ride);

        // Bounded recovery retries cover transient client/network failures.
        // Each attempt has a distinct idempotency key; backend state transitions
        // and optimistic version checks prevent concurrent dispatch assignment.
        const recoveryAttempts = recoveryAttemptCountRef.current.get(data.ride.id) ?? 0;
        const recoveryNextAttemptAt = recoveryNextAttemptAtRef.current.get(data.ride.id) ?? 0;
        if (
          data.orchestration?.recoveryRequired &&
          (data.ride.status === "SEARCHING" || data.ride.status === "DRIVER_ASSIGNED") &&
          recoveryAttempts < 3 &&
          Date.now() >= recoveryNextAttemptAt &&
          !recoveryInFlightRef.current.has(data.ride.id)
        ) {
          recoveryInFlightRef.current.add(data.ride.id);
          const attemptNumber = recoveryAttempts + 1;
          try {
            const recoveryResponse = await fetch("/api/mobility/rides/" + encodeURIComponent(data.ride.id), {
              method: "PATCH",
              credentials: "include",
              cache: "no-store",
              headers: {
                "Content-Type": "application/json",
                // A distinct key prevents replaying an earlier recovery event.
                "Idempotency-Key": "marka-ride-auto-recovery-" + data.ride.id + "-" + attemptNumber,
                "X-Organization-Id": organizationId || "",
              },
              body: JSON.stringify({ action: "RETRY_DISPATCH" }),
            });

            if (recoveryResponse.status === 409) {
              // The server's dispatch lease is 120 seconds. Do not burn an
              // automatic attempt or hammer the endpoint while that lease is active.
              recoveryNextAttemptAtRef.current.set(data.ride.id, Date.now() + 120_000);
              return;
            }

            if (recoveryResponse.status === 429) {
              const retryAfter = Number(recoveryResponse.headers.get("Retry-After"));
              const delay = Number.isFinite(retryAfter) && retryAfter > 0
                ? Math.min(120_000, retryAfter * 1000)
                : 30_000;
              recoveryNextAttemptAtRef.current.set(data.ride.id, Date.now() + delay);
              return;
            }

            const recoveryData = await recoveryResponse.json() as RideResponse;
            if (!recoveryResponse.ok) {
              recoveryAttemptCountRef.current.set(data.ride.id, attemptNumber);
              recoveryNextAttemptAtRef.current.set(data.ride.id, Date.now() + Math.min(30_000, 2_500 * (2 ** recoveryAttempts)));
              return;
            }

            recoveryAttemptCountRef.current.set(data.ride.id, attemptNumber);
            if (mounted && recoveryData.ride) {
              setRide(recoveryData.ride);
              setRideMessage(recoveryData.orchestration?.recoveryRequired
                ? "Pedido registado. A procura de motorista continua em recuperação."
                : "A procura de motorista foi retomada para a mesma viagem.");
            }
            if (recoveryData.orchestration?.recoveryRequired) {
              recoveryNextAttemptAtRef.current.set(data.ride.id, Date.now() + Math.min(30_000, 2_500 * (2 ** recoveryAttempts)));
            } else {
              recoveryNextAttemptAtRef.current.delete(data.ride.id);
            }
          } catch {
            recoveryAttemptCountRef.current.set(data.ride.id, attemptNumber);
            recoveryNextAttemptAtRef.current.set(data.ride.id, Date.now() + Math.min(30_000, 2_500 * (2 ** recoveryAttempts)));
          } finally {
            recoveryInFlightRef.current.delete(data.ride.id);
          }
        }
      } catch {
        // Retry status retrieval on the next polling cycle.
      }
    };
    const timer = window.setInterval(() => void poll(), 2500);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [ride?.id, ride?.status, organizationId]);

  useEffect(() => {
    const value = originText.trim();
    if (value.length < 3 || value === "A minha localização GPS" || (origin && value === origin.label) || active) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setOriginSearchBusy(true);
      try {
        const places = await searchPlacesInAngola(value, controller.signal);
        if (!controller.signal.aborted) setOriginSuggestions(places);
      } finally {
        if (!controller.signal.aborted) setOriginSearchBusy(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [originText, origin, active]);

  useEffect(() => {
    const value = destinationText.trim();
    if (value.length < 3 || active) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchBusy(true);
      try {
        const places = await searchPlacesInAngola(value, controller.signal);
        if (!controller.signal.aborted) setSuggestions(places);
      } finally {
        if (!controller.signal.aborted) setSearchBusy(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [destinationText, active]);

  useEffect(() => {
    if (!active || !assigned) return;
    let mounted = true;
    const updateEta = async () => {
      const current = etaInput.current;
      if (!current.driver || !current.origin) {
        if (mounted) {
          setDriverEta(null);
          setDriverApproachGeometry(null);
        }
        return;
      }
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
        const data = await response.json() as { route?: { durationSeconds?: number; geometry?: MobilityRoute["geometry"] } };
        const route = data.route;
        if (mounted && route && Number.isFinite(route.durationSeconds)) {
          const rideId = ride?.id ?? "";
          setDriverEta({ rideId, minutes: Math.max(1, Math.ceil(Number(route.durationSeconds) / 60)) });
          if (route.geometry?.type === "LineString" && route.geometry.coordinates.length >= 2) {
            setDriverApproachGeometry({ rideId, geometry: route.geometry });
          } else {
            setDriverApproachGeometry(null);
          }
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
    setRoute(null);
    setQuote(null);
    setFareByService({});
    setFareStatus("NO_ROUTE");
    setError(null);
  };

  useEffect(() => {
    const requestedService = new URLSearchParams(window.location.search).get("service");
    if (requestedService !== "moto") return;
    // The URL query is the initial service selection when returning from the freight screen.
    /* eslint-disable react-hooks/set-state-in-effect */
    setGroup("MOTO");
    setServiceType("MOTO_TAXI");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const chooseOrigin = (place: Place) => {
    setOrigin(place);
    setOriginText(place.label);
    setOriginSuggestions([]);
    setRoute(null);
    setQuote(null);
    setFareByService({});
    setFareStatus("NO_ROUTE");
    setError(null);
  };

  const chooseDestination = (place: Place) => {
    setDestination(place);
    setDestinationText(place.label);
    setSuggestions([]);
    setRoute(null);
    setQuote(null);
    setFareByService({});
    setFareStatus("NO_ROUTE");
    setError(null);
  };

  const chooseMapDestination = useCallback(async (point: { lat: number; lon: number }) => {
    let label = "Ponto seleccionado no mapa";
    try {
      const url = new URL("https://photon.komoot.io/reverse");
      url.searchParams.set("lat", String(point.lat));
      url.searchParams.set("lon", String(point.lon));
      url.searchParams.set("lang", "pt");
      const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (response.ok) {
        const data = await response.json() as { features?: Array<{ properties?: Record<string, unknown> }> };
        const properties = data.features?.[0]?.properties ?? {};
        const parts = [properties.name, properties.street, properties.district, properties.city, properties.state]
          .filter((part): part is string => typeof part === "string" && part.length > 0)
          .filter((part, index, all) => all.indexOf(part) === index);
        if (parts.length) label = parts.join(", ");
      }
    } catch {
      // The selected coordinates remain usable when reverse geocoding is unavailable.
    }
    chooseDestination({ lat: point.lat, lon: point.lon, label });
  }, []);

  const locateMe = () => {
    if (!window.isSecureContext) {
      setLocationStatus("A localização só funciona em HTTPS. Abra markaao.com.");
      setError("A localização do telemóvel exige uma ligação segura HTTPS.");
      return;
    }
    if (!navigator.geolocation) {
      setLocationStatus("Este navegador não disponibiliza localização.");
      setError("Ative os serviços de localização do Android ou use outro navegador compatível.");
      return;
    }

    setGpsBusy(true);
    setError(null);
    setLocationStatus("A pedir autorização e a obter a sua localização…");

    let completed = false;
    const finish = () => {
      completed = true;
      setGpsBusy(false);
    };
    const applyPosition = (position: GeolocationPosition) => {
      if (completed) return;
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
        || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        finish();
        setLocationStatus("O telemóvel devolveu coordenadas inválidas. Tente novamente.");
        return;
      }
      const point = {
        lat: latitude,
        lon: longitude,
        label: "A minha localização GPS",
      };
      setOrigin(point);
      setOriginText(point.label);
      setOriginSuggestions([]);
      setRoute(null);
      setQuote(null);
      setFareByService({});
      setFareStatus("NO_ROUTE");
      setLocationStatus(
        Number.isFinite(accuracy)
          ? "Partida definida pela localização do telemóvel (precisão aproximada: " + Math.round(accuracy) + " m)."
          : "Partida definida pela localização do telemóvel.",
      );
      finish();
    };
    const fail = (geoError: GeolocationPositionError) => {
      if (completed) return;
      finish();
      if (geoError.code === geoError.PERMISSION_DENIED) {
        setLocationStatus("Permissão recusada. Ative a localização para o navegador nas definições do Android e tente novamente.");
        setError("A MARKA precisa da sua autorização para usar a localização como ponto de partida.");
      } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
        setLocationStatus("O telemóvel não conseguiu determinar a posição. Ative a localização do dispositivo e tente novamente.");
        setError("Não foi possível obter a posição atual.");
      } else {
        setLocationStatus("A localização demorou demasiado. Confirme o GPS e tente novamente num local com melhor sinal.");
        setError("O GPS não respondeu dentro do tempo esperado.");
      }
    };

    // First request: precise GPS. The browser permission prompt is triggered
    // by this explicit user action, never automatically on page load.
    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (preciseError) => {
        if (completed) return;
        if (preciseError.code === preciseError.PERMISSION_DENIED) {
          fail(preciseError);
          return;
        }
        setLocationStatus("O sinal GPS está lento. A tentar localização assistida pela rede…");
        // Second request: network/Wi-Fi-assisted location for indoor or weak GPS.
        navigator.geolocation.getCurrentPosition(
          applyPosition,
          fail,
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
        );
      },
      { enableHighAccuracy: true, timeout: 18000, maximumAge: 0 },
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
    if (origin.lat === destination.lat && origin.lon === destination.lon) {
      setError("A partida e o destino não podem ser o mesmo local.");
      return;
    }
    if (!quote) {
      setError("A tarifa desta categoria ainda não está configurada. Não vamos apresentar um preço inventado.");
      return;
    }
    setCreating(true);
    const payload = {
      serviceType,
      ...(serviceType !== "MOTO_TAXI" && passengers !== "" ? { passengerCount: passengers } : {}),
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
      },
    };
    const requestFingerprint = JSON.stringify(payload);
    const storageKey = "marka:mobility:pending-ride:" + organizationId;
    let idempotencyKey: string;
    try {
      const pendingRaw = window.sessionStorage.getItem(storageKey);
      const pending = pendingRaw ? JSON.parse(pendingRaw) as { key?: string; fingerprint?: string } : null;
      idempotencyKey = pending?.fingerprint === requestFingerprint && typeof pending.key === "string"
        ? pending.key
        : "marka-ride-" + crypto.randomUUID();
      window.sessionStorage.setItem(storageKey, JSON.stringify({ key: idempotencyKey, fingerprint: requestFingerprint }));
    } catch {
      idempotencyKey = "marka-ride-" + crypto.randomUUID();
    }
    try {
      const response = await fetch("/api/mobility/rides", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          "X-Organization-Id": organizationId,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as RideResponse;
      if (!response.ok || !data.ride) {
        const message = response.status === 409 && data.message
          ? data.message
          : data.message || "Não foi possível registar o pedido. A mesma tentativa pode ser repetida sem criar uma viagem duplicada.";
        throw new Error(message);
      }
      try {
        const pendingRaw = window.sessionStorage.getItem(storageKey);
        const pending = pendingRaw ? JSON.parse(pendingRaw) as { key?: string } : null;
        if (pending?.key === idempotencyKey) window.sessionStorage.removeItem(storageKey);
      } catch {
        // A chave de idempotência é apenas um apoio local; o servidor mantém a autoridade.
      }
      setRide(data.ride);
      setConfirmedFareMinor(data.pricing?.finalFareMinor ?? (typeof data.ride.metadata?.estimatedFareMinor === "string" ? data.ride.metadata.estimatedFareMinor : null));
      setCommunicationThreadId(null);
      setCallPanelOpen(false);
      setCommunicationError(null);
      setRideMessage(data.ride.status === "NO_DRIVER_FOUND"
        ? "Não encontrámos motoristas disponíveis para esta solicitação. Pode ajustar o pedido ou tentar novamente mais tarde."
        : (data.recoveryRequired || data.orchestration?.recoveryRequired)
          ? "Pedido registado; estamos a recuperar uma etapa operacional. Não crie outro pedido."
          : "Pedido enviado aos motoristas elegíveis.");
    } catch (requestFailure) {
      setError(requestFailure instanceof Error ? requestFailure.message : "Falha ao criar o pedido.");
    } finally {
      setCreating(false);
    }
  }

  async function retryNoDriverRide() {
    if (!ride || ride.status !== "NO_DRIVER_FOUND" || !organizationId || retryingRide) return;
    setRetryingRide(true);
    setError(null);
    try {
      const response = await fetch("/api/mobility/rides/" + encodeURIComponent(ride.id), {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "marka-ride-retry-" + crypto.randomUUID(),
          "X-Organization-Id": organizationId,
        },
        body: JSON.stringify({ action: "RETRY_DISPATCH", safetyMode: safety }),
      });
      const data = await response.json() as RideResponse;
      if (!response.ok || !data.ride) {
        throw new Error(data.message || "Não foi possível repetir a procura de motorista.");
      }
      setRide(data.ride);
      setRideMessage(data.ride.status === "NO_DRIVER_FOUND"
        ? "Continuamos sem motoristas elegíveis. Pode tentar novamente mais tarde ou criar um novo pedido."
        : data.orchestration?.recoveryRequired
          ? "A procura foi retomada; estamos a recuperar uma etapa operacional."
          : "A procura foi retomada para a mesma viagem.");
    } catch (retryFailure) {
      setError(retryFailure instanceof Error ? retryFailure.message : "Falha ao repetir a procura.");
    } finally {
      setRetryingRide(false);
    }
  }
  const driverRating = Number(ride?.driver?.user?.rating);
  const driverName = ride?.driver?.user?.name || "Motorista MARKA";
  const driverAvatar = ride?.driver?.user?.profile?.avatarUrl;
  const vehicleName = [ride?.vehicle?.make, ride?.vehicle?.model].filter(Boolean).join(" ") || "Viatura atribuída";
  const plate = ride?.vehicle?.plateNumber || ride?.vehicle?.registrationNumber || "Matrícula a confirmar";

  return (
    <main className="fixed inset-0 z-40 isolate h-[100dvh] w-full overflow-hidden bg-[#09090b] text-white">
      <MobilityLiveMap
        onRouteChange={onRoute}
        onMapDestinationSelect={(point) => void chooseMapDestination(point)}
        onRouteStatusChange={onRouteStatus}
        serviceType={serviceType}
        serviceTypes={serviceTypes}
        driverPoint={driver}
        driverRouteGeometry={visibleDriverApproachGeometry}
        originPoint={origin}
        destinationPoint={destination}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))] sm:px-6">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Abrir menu"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#0d0d0f]/75 text-lg shadow-xl backdrop-blur-xl"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div className="rounded-full border border-white/10 bg-[#0d0d0f]/75 px-4 py-2 text-center backdrop-blur-xl">
          <p className="text-[10px] font-black tracking-[.24em]">MARKA <span className="text-[#c8a24a]">MOBILITY</span></p>
          <p className="mt-0.5 text-[8px] tracking-[.18em] text-white/40">ANGOLA · PREMIUM MOBILITY</p>
        </div>
        <Link
          href="/app/account"
          aria-label="Abrir perfil"
          className="pointer-events-auto relative grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-[#c8a24a]/65 bg-[#141417] shadow-xl"
        >
          {user?.profile?.avatarUrl
            ? <img src={user.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            : <span className="text-sm font-bold text-[#c8a24a]">{name.slice(0, 1).toUpperCase()}</span>}
          {user?.isIdentityVerified && <span className="absolute bottom-0 right-0 grid h-4 w-4 place-items-center rounded-full border-2 border-[#09090B] bg-[#c8a24a] text-[8px] font-black text-[#09090B]">✓</span>}
        </Link>
      </header>

      {drawer && (
        <div className="absolute inset-0 z-50">
          <button type="button" aria-label="Fechar menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col border-r border-white/10 bg-[#101013] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-[.2em]">MARKA <span className="text-[#c8a24a]">MOBILITY</span></span>
              <button type="button" onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/[.06]" aria-label="Fechar">×</button>
            </div>
            <div className="mt-9 flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#c8a24a] bg-[#25252A]">
                {user?.profile?.avatarUrl
                  ? <img src={user.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  : <div className="grid h-full w-full place-items-center text-lg font-semibold text-[#c8a24a]">{name.slice(0, 1).toUpperCase()}</div>}
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
            <div className="mt-auto rounded-2xl border border-[#c8a24a]/30 bg-[#c8a24a]/[.07] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#c8a24a]">Alternar modo</p>
              <p className="mt-2 text-sm font-semibold">Modo Motorista</p>
              <p className="mt-1 text-[10px] leading-4 text-white/45">Receba pedidos e acompanhe as recolhas.</p>
              <Link href="/app/driver" className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-[#c8a24a] text-xs font-bold text-[#17130A]">Entrar no modo motorista →</Link>
            </div>
            <p className="mt-5 text-[9px] text-white/25">Powered By Magestade Pura Digital</p>
          </aside>
        </div>
      )}

      <form
        onSubmit={submit}
        className={"absolute inset-x-0 bottom-0 z-20 mx-auto " + (active ? "max-h-[40dvh] sm:max-h-[46dvh] " : panelExpanded ? "max-h-[82dvh] " : "max-h-[46dvh] sm:max-h-[48dvh] ") + "w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-[28px] border border-white/10 bg-[#0d0d0f]/75 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-20px_70px_rgba(0,0,0,.28)] backdrop-blur-xl sm:bottom-4 sm:rounded-[28px] sm:px-6"}
      >
        <button type="button" onClick={() => setPanelExpanded((value) => !value)} aria-label={panelExpanded ? "Recolher painel" : "Expandir painel"} aria-expanded={panelExpanded} className="mx-auto mb-2 flex h-5 w-16 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c8a24a]"><span className="h-1 w-10 rounded-full bg-gradient-to-r from-white/20 via-[#c8a24a]/90 to-white/20" /></button>
        {active ? (
          <section className="pb-3" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#c8a24a]">Viagem em tempo real</p>
              <span className="rounded-full border border-[#c8a24a]/25 bg-[#c8a24a]/10 px-3 py-1.5 text-[9px] text-[#c8a24a]">{labels[ride?.status || ""] || ride?.status}</span>
            </div>
            {confirmedFareMinor && /^\d+$/.test(confirmedFareMinor) && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-[#c8a24a]/20 bg-[#c8a24a]/[.06] px-3 py-2.5">
                <span className="text-[10px] text-white/55">Preço confirmado pela MARKA</span>
                <strong className="text-sm text-[#e8c77c]">{fmt(Number(BigInt(confirmedFareMinor)) / 100)}</strong>
              </div>
            )}
            {!assigned ? (
              <div className="mt-4 flex items-center gap-4 rounded-2xl bg-black/25 p-4">
                <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#c8a24a]/35 bg-[#c8a24a]/10">
                  <span className="absolute inset-0 animate-ping rounded-full border border-[#c8a24a]/50" />
                  <span className="text-xl text-[#c8a24a]">⌖</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">A procurar motorista</p>
                  <p className="mt-1 text-[10px] text-white/45">O pedido está a ser enviado aos motoristas elegíveis.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-2xl border border-[#c8a24a]/20 bg-black/25 p-4">
                  <p className="text-base font-semibold tracking-tight">
                    {visibleDriverEta !== null ? "O seu motorista chega em " + visibleDriverEta + " min" : "O seu motorista está a caminho"}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#c8a24a] bg-[#25252A]">
                      {driverAvatar
                        ? <img src={driverAvatar} alt="" className="h-full w-full object-cover" />
                        : <div className="grid h-full place-items-center text-lg font-bold text-[#c8a24a]">{driverName.slice(0, 1).toUpperCase()}</div>}
                      {ride?.driver?.user?.isIdentityVerified && <span className="absolute bottom-0 right-0 grid h-4 w-4 place-items-center rounded-full border-2 border-[#09090B] bg-[#c8a24a] text-[8px] font-black text-[#09090B]">✓</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{driverName}</p>
                      <p className="mt-1 text-[10px] text-white/45">{vehicleName}</p>
                      <p className="mt-1 text-[10px] font-semibold tracking-[.12em] text-[#c8a24a]">{plate}</p>
                    </div>
                    <div className="text-right">
                      {Number.isFinite(driverRating) && driverRating > 0
                        ? <p className="text-xs font-bold text-[#c8a24a]">★ {driverRating.toFixed(2)}</p>
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
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#c8a24a]/35 bg-[#c8a24a]/[.08] text-xs font-semibold text-[#c8a24a] disabled:opacity-50"
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
                  <div className="mt-3 rounded-2xl border border-[#c8a24a]/20 bg-black/25 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3"><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#c8a24a]">Chamada segura MARKA</p><button type="button" onClick={() => setCallPanelOpen(false)} className="text-xs text-white/50">Fechar</button></div>
                    <MarketplaceCallPanel threadId={communicationThreadId} />
                  </div>
                )}
              </>
            )}
            {rideMessage && <p className="mt-3 text-[10px] text-white/45">{rideMessage}</p>}
            {communicationError && <p role="alert" className="mt-2 text-[10px] text-rose-200">{communicationError}</p>}
            <Link href="/app/driver" className="mt-4 inline-flex text-[10px] text-[#c8a24a] underline">Acompanhar operações →</Link>
          </section>
        ) : (
          <>
            {ride?.status === "NO_DRIVER_FOUND" && (
              <div role="status" aria-live="polite" className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/[.08] p-4">
                <p className="text-sm font-semibold text-amber-200">Sem motoristas disponíveis neste momento</p>
                <p className="mt-1 text-xs leading-5 text-white/65">
                  O pedido anterior foi registado, mas nenhum motorista elegível foi encontrado. Pode alterar o destino ou a categoria e enviar um novo pedido.
                </p>
                {confirmedFareMinor && /^\d+$/.test(confirmedFareMinor) && (
                  <p className="mt-2 text-xs font-semibold text-[#e8c77c]">Preço calculado: {fmt(Number(BigInt(confirmedFareMinor)) / 100)}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={retryNoDriverRide}
                    disabled={retryingRide}
                    className="min-h-10 rounded-xl bg-[#c8a24a] px-4 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {retryingRide ? "A procurar..." : "Tentar novamente"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRide(null);
                      setRideMessage(null);
                      setError(null);
                    }}
                    className="min-h-10 rounded-xl border border-amber-300/30 px-3 text-xs font-semibold text-amber-100"
                  >
                    Fazer novo pedido
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#c8a24a]">Reserve a sua deslocação</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">Para onde vamos?</h1>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] text-white/40">AOA · Kz</span>
            </div>

            <MobilityServiceTabs active={group === "MOTO" ? "moto" : "taxi"} onSelect={(service) => changeGroup(service === "moto" ? "MOTO" : "EXECUTIVE")} />

            <div className="mt-3 space-y-2 rounded-2xl border border-white/[.09] bg-black/25 p-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={locateMe}
                  disabled={gpsBusy}
                  aria-label="Usar a minha localização como partida"
                  title="Usar a localização do telemóvel como partida"
                  className="grid h-11 w-[60px] shrink-0 place-items-center rounded-xl border border-[#c8a24a]/30 bg-[#c8a24a]/10 text-[#c8a24a] disabled:opacity-50"
                >
                  {gpsBusy
                    ? <span className="text-sm">…</span>
                    : <span className="flex flex-col items-center leading-none"><span className="text-base">⌖</span><span className="mt-0.5 text-[8px] font-bold tracking-wide">GPS</span></span>}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] uppercase tracking-[.16em] text-white/35">Partida</p>
                  <input
                    value={originText}
                    onChange={(event) => {
                      const value = event.target.value;
                      setOriginText(value);
                      setOriginSuggestions([]);
                      if (origin && value !== origin.label) {
                        setOrigin(null);
                        setRoute(null);
                        setQuote(null);
                        setFareByService({});
                        setFareStatus("NO_ROUTE");
                      }
                    }}
                    placeholder="GPS ou pesquisar bairro/rua"
                    aria-label="Pesquisar local de partida em Angola"
                    autoComplete="off"
                    className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                  />
                </div>
                {originSearchBusy && originText.trim().length >= 3 && !active && <span className="pr-2 text-[9px] text-white/35">A pesquisar…</span>}
              </div>
              {locationStatus && <p className="px-2 pb-1 text-[10px] leading-4 text-[#c8a24a]" role="status" aria-live="polite">{locationStatus}</p>}
              {originSuggestions.length > 0 && !active && (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-[#101013]">
                  {originSuggestions.map((place, index) => (
                    <button key={place.label + index} type="button" onClick={() => chooseOrigin(place)} className="flex min-h-11 w-full items-center gap-3 border-b border-white/[.06] px-3 text-left text-xs text-white/80 last:border-0 hover:bg-white/[.05]">
                      <span className="text-[#c8a24a]">A</span>
                      <span className="line-clamp-2">{place.label}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 border-t border-white/[.07] pt-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[.04] text-xs text-[#c8a24a]">B</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] uppercase tracking-[.16em] text-white/35">Destino</p>
                  <input
                    value={destinationText}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDestinationText(value);
                      setSuggestions([]);
                      setSearchBusy(false);
                      if (destination && value !== destination.label) {
                        setDestination(null);
                        setRoute(null);
                        setQuote(null);
                        setFareByService({});
                        setFareStatus("NO_ROUTE");
                      }
                    }}
                    placeholder="Para onde vamos?"
                    aria-label="Pesquisar destino em Angola"
                    autoComplete="off"
                    className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                  />
                </div>
                {searchBusy && destinationText.trim().length >= 3 && !active && <span className="pr-2 text-[9px] text-white/35">A pesquisar…</span>}
              </div>
              {suggestions.length > 0 && destinationText.trim().length >= 3 && !active && (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-[#101013]">
                  {suggestions.map((place, index) => (
                    <button key={place.label + index} type="button" onClick={() => chooseDestination(place)} className="flex min-h-11 w-full items-center gap-3 border-b border-white/[.06] px-3 text-left text-xs text-white/80 last:border-0 hover:bg-white/[.05]">
                      <span className="text-[#c8a24a]">B</span>
                      <span className="line-clamp-2">{place.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {panelExpanded && (
              <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/[.035] p-3">
                {group !== "MOTO" && (
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="marka-passengers" className="text-[11px] text-white/60">Passageiros</label>
                    <input id="marka-passengers" type="number" min={1} max={4} value={passengers} placeholder="1" onChange={(event) => { const value = event.target.value; setPassengers(value === "" ? "" : Math.max(1, Math.min(4, Number(value) || 1))); }} className="h-10 w-20 rounded-xl border border-white/10 bg-black/30 px-2 text-center text-xs text-white" />
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="marka-safety" className="text-[11px] text-white/60">Protecção da viagem</label>
                  <select id="marka-safety" value={safety} onChange={(event) => setSafety(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#09090b] px-3 text-xs text-white">
                    <option value="STANDARD">Padrão</option>
                    <option value="TRUSTED">Contacto de confiança</option>
                    <option value="CHILD">Menor · reforçada</option>
                  </select>
                </div>
                {list.map((item) => (
                  <button key={item.id} type="button" onClick={() => { setServiceType(item.id); setQuote(fareByService[item.id] ?? null); setFareStatus(fareByService[item.id] ? "AVAILABLE" : fareByService[item.id] === null ? "TARIFF_NOT_CONFIGURED" : "NO_ROUTE"); setError(null); }} aria-pressed={serviceType === item.id} className={"flex min-h-12 w-full items-center justify-between rounded-xl border px-3 text-left " + (serviceType === item.id ? "border-[#c8a24a]/45 bg-[#c8a24a]/10" : "border-white/10 bg-white/[.03]")}>
                    <span className="text-xs font-medium">{item.title}</span>
                    <span className="text-xs font-semibold text-[#e8c77c]">{fareByService[item.id] ? fmt(fareByService[item.id]!.totalAOA) : "—"}</span>
                  </button>
                ))}
              </div>
            )}

            {error && <p role="alert" className="mt-3 rounded-lg border border-rose-300/20 bg-rose-300/[.05] p-3 text-[10px] text-rose-100">{error}</p>}
            {route && !quote && fareStatus === "TARIFF_NOT_CONFIGURED" && (
              <div role="status" className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-3 text-[10px] leading-5 text-amber-100/90">
                <strong className="block text-amber-100">Tarifa ainda não disponível</strong>
                A rota foi calculada, mas a tabela oficial desta categoria ainda não está configurada pela MARKA. O pedido fica temporariamente bloqueado para não apresentar um preço inventado. Tente outra categoria ou volte mais tarde.
              </div>
            )}

            <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-white/10 bg-[#0d0d0f]/90 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(0,0,0,.35)] backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[10px] font-medium text-white/65" role="status" aria-live="polite">
                    <span className={"h-2 w-2 shrink-0 rounded-full " + (routeStatus.state === "ready" ? "bg-emerald-400" : routeStatus.state === "error" ? "bg-rose-400" : routeStatus.state === "calculating" ? "animate-pulse bg-amber-300" : "bg-white/30")} />
                    <span className="truncate">{!origin ? "Defina a partida pelo GPS ou pesquise um local." : !destination ? (destinationText.trim() ? "Escolha um destino na lista de resultados." : "Pesquise e selecione o destino.") : routeStatus.message}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[8px] uppercase tracking-[.14em] text-white/35">Preço</p>
                  <p className="text-sm font-extrabold text-[#e8c77c]">{quote ? fmt(quote.totalAOA) : fareStatus === "TARIFF_NOT_CONFIGURED" ? "Pendente" : "—"}</p>
                </div>
              </div>
              <button
                type="submit"
                disabled={!route || !quote || creating}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-[#f0d28b]/40 bg-[linear-gradient(110deg,#f0d28b_0%,#c8a24a_48%,#a98131_100%)] px-4 text-[13px] font-extrabold tracking-[.01em] text-[#09090B] shadow-[0_12px_34px_rgba(229,184,75,.22),inset_0_1px_0_rgba(255,255,255,.45)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_16px_42px_rgba(229,184,75,.28)] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creating ? "A enviar pedido…" : !origin ? "Defina a partida" : !destination ? "Selecione o destino" : routeStatus.state === "calculating" ? "A calcular rota…" : routeStatus.state === "error" ? "Rota indisponível" : route && !quote && fareStatus === "TARIFF_NOT_CONFIGURED" ? "Tarifa pendente" : serviceType === "MOTO_TAXI" ? "Pedir moto-táxi" : "Pedir táxi"}
              </button>
              <p className="mt-2 text-center text-[8px] text-white/35">{route ? (route.distanceMeters / 1000).toFixed(1) + " km · " + Math.max(1, Math.round(route.durationSeconds / 60)) + " min · " : ""}Só após rota e tarifa válidas.</p>
            </div>
          </>
        )}
      </form>
    </main>
  );
}
