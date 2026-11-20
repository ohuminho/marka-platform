"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type Marker } from "maplibre-gl";
import LeafletRouteFallback from "./LeafletRouteFallback";

export type MobilityMapPoint = { lat: number; lon: number; label: string };
export type MobilityRoute = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  fare?: { currency: string; totalMinor: string; totalAOA: number } | null;
  fares?: Record<string, { currency: string; totalMinor: string; totalAOA: number } | null>;
  fareStatus?: string;
};

export type MobilityRouteStatus = { state: "idle" | "calculating" | "ready" | "error"; message: string };

type Props = {
  /** Backward-compatible callback for legacy MobilityExperience callers. */
  onPointsChange?: (points: { origin: MobilityMapPoint | null; destination: MobilityMapPoint | null }) => void;
  onRouteChange?: (route: MobilityRoute | null) => void;
  onRouteStatusChange?: (status: MobilityRouteStatus) => void;
  onMapDestinationSelect?: (point: { lat: number; lon: number }) => void;
  serviceType?: string;
  serviceTypes?: string;
  driverPoint?: { lat: number; lon: number; bearing?: number | null } | null;
  driverRouteGeometry?: MobilityRoute["geometry"] | null;
  originPoint?: MobilityMapPoint | null;
  destinationPoint?: MobilityMapPoint | null;
  showStatus?: boolean;
};

const PRIMARY_STYLE = "https://tiles.openfreemap.org/styles/positron";

function markerElement(kind: "pickup" | "dropoff" | "driver") {
  const el = document.createElement("div");
  el.className = "marka-map-marker marka-map-marker--" + kind + (kind === "pickup" ? " marka-route-pulse" : "");
  if (kind === "driver") {
    el.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 19.5 7.5 12a3 3 0 0 1 2.8-2h11.4a3 3 0 0 1 2.8 2l2.5 7.5v5H5z" fill="#171717" stroke="#E5B84B" stroke-width="1.6"/><path d="M10 12h12l2 5H8z" fill="#737373"/><circle cx="10" cy="24" r="2.2" fill="#09090B" stroke="#E5B84B"/><circle cx="22" cy="24" r="2.2" fill="#09090B" stroke="#E5B84B"/></svg>';
  } else {
    el.innerHTML = "<span>" + (kind === "pickup" ? "A" : "B") + "</span>";
  }
  return el;
}


export default function MobilityLiveMap({
  onRouteChange,
  onRouteStatusChange,
  onMapDestinationSelect,
  serviceType = "TAXI",
  serviceTypes = serviceType,
  driverPoint = null,
  driverRouteGeometry = null,
  originPoint = null,
  destinationPoint = null,
  showStatus = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapDestinationSelectRef = useRef(onMapDestinationSelect);
  useEffect(() => { mapDestinationSelectRef.current = onMapDestinationSelect; }, [onMapDestinationSelect]);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<{ pickup: Marker | null; dropoff: Marker | null; driver: Marker | null }>({
    pickup: null,
    dropoff: null,
    driver: null,
  });
  const requestRef = useRef(0);
  const driverAnimationRef = useRef<number | null>(null);
  const routeRef = useRef<MobilityRoute | null>(null);
  const driverRouteRef = useRef<MobilityRoute["geometry"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Defina a partida e o destino para calcular a rota.");
  const [mapError, setMapError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [displayRoute, setDisplayRoute] = useState<MobilityRoute | null>(null);
  const [leafletFailed, setLeafletFailed] = useState(false);

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    // MapLibre initializes WebGL in its constructor. If the device cannot
    // create a WebGL context, the constructor failure activates the next renderer.
    let map: MapLibreMap;
    let initializedMap: MapLibreMap | null = null;
    let resize: ResizeObserver | null = null;
    let rendererErrors = 0;
    let styleLoaded = false;
    let styleTimeout: number | null = null;
    let tilesTimeout: number | null = null;
    try {
      map = new maplibregl.Map({
        container: hostRef.current,
        style: PRIMARY_STYLE,
        center: [13.23, -8.83],
        zoom: 11,
        attributionControl: {},
        cooperativeGestures: true,
        pitchWithRotate: false,
        dragRotate: false,
        maxPitch: 0,
      });
      initializedMap = map;
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("click", (event) => mapDestinationSelectRef.current?.({ lat: event.lngLat.lat, lon: event.lngLat.lng }));
      // If the vector style stalls without emitting a useful error, move to
      // the Leaflet renderer instead of leaving the passenger on a blank map.
      styleTimeout = window.setTimeout(() => {
        if (!styleLoaded) setMapError("O mapa principal demorou a responder. A activar o mapa alternativo.");
      }, 8000);
      map.on("style.load", () => {
        styleLoaded = true;
        if (styleTimeout !== null) window.clearTimeout(styleTimeout);
        setMapReady(true);
        map.addSource("marka-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "marka-route-glow",
          type: "line",
          source: "marka-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#E5B84B", "line-width": 10, "line-opacity": 0.16, "line-blur": 4 },
        });
        map.addLayer({
          id: "marka-route-line",
          type: "line",
          source: "marka-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#E5B84B", "line-width": 4, "line-opacity": 0.98 },
        });
        map.addSource("marka-driver-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "marka-driver-route-line",
          type: "line",
          source: "marka-driver-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#E5B84B", "line-width": 2.5, "line-opacity": 0.42, "line-dasharray": [2, 2] },
        });
        if (driverRouteRef.current) {
          (map.getSource("marka-driver-route") as GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry: driverRouteRef.current,
          });
        }
        if (routeRef.current) {
          (map.getSource("marka-route") as GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry: routeRef.current.geometry,
          });
        }
        map.resize();
        // A loaded style is not enough: the passenger needs actual road tiles.
        // Switch to Leaflet if the basemap remains empty or stalled.
        tilesTimeout = window.setTimeout(() => {
          if (!map.areTilesLoaded()) {
            setMapError("As imagens do mapa não chegaram a carregar. A activar o mapa alternativo.");
          }
        }, 9000);
      });
      map.on("idle", () => {
        if (tilesTimeout !== null && map.areTilesLoaded()) {
          window.clearTimeout(tilesTimeout);
          tilesTimeout = null;
        }
      });
      map.on("error", (event) => {
        if (!event.error?.message) return;
        rendererErrors += 1;
        if (rendererErrors >= 3 || /webgl|context/i.test(event.error.message)) {
          setMapError("A alternar automaticamente para o mapa de reserva.");
        }
      });
      resize = new ResizeObserver(() => map.resize());
      resize.observe(hostRef.current);
    } catch (error) {
      try { initializedMap?.remove(); } catch { /* Ignore partial MapLibre initialization cleanup. */ }
      mapRef.current = null;
      const fallbackMessage = error instanceof Error && /webgl|context/i.test(error.message)
        ? "Não foi possível iniciar o mapa neste dispositivo. A rota e o preço continuam independentes do mapa."
        : "Não foi possível iniciar a visualização do mapa. A rota e o preço continuam independentes do mapa.";
      queueMicrotask(() => {
        if (hostRef.current) setMapError(fallbackMessage);
      });
      return;
    }

    return () => {
      resize?.disconnect();
      if (styleTimeout !== null) window.clearTimeout(styleTimeout);
      if (tilesTimeout !== null) window.clearTimeout(tilesTimeout);
      if (driverAnimationRef.current !== null) cancelAnimationFrame(driverAnimationRef.current);
      Object.values(markersRef.current).forEach((marker) => marker?.remove());
      if (mapRef.current === map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapError) return;
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach((marker) => marker?.remove());
    markersRef.current = { pickup: null, dropoff: null, driver: null };
    map.remove();
    mapRef.current = null;
  }, [mapError]);

  const calculateRoute = useCallback(async (from: MobilityMapPoint, to: MobilityMapPoint) => {
    const id = ++requestRef.current;
    setBusy(true);
    setRouteError(null);
    setStatus("A calcular a rota rodoviária…");
    onRouteStatusChange?.({ state: "calculating", message: "A calcular a rota rodoviária…" });
    try {
      const query = new URLSearchParams({
        originLat: String(from.lat),
        originLng: String(from.lon),
        destinationLat: String(to.lat),
        destinationLng: String(to.lon),
        serviceType,
        serviceTypes,
      });
      const response = await fetch("/api/mobility/routing/geometry?" + query.toString(), {
        credentials: "include",
        cache: "no-store",
        // Route calculation includes session validation, provider routing and server-side fare lookup.
        // A 2.5s client cutoff was aborting valid requests on slower mobile networks.
        signal: AbortSignal.timeout(8000),
      });
      const data = await response.json() as {
        route?: MobilityRoute;
        fare?: { currency: string; totalMinor: string; totalAOA: number } | null;
        fareStatus?: string;
        fares?: Record<string, { currency: string; totalMinor: string; totalAOA: number } | null>;
        message?: string;
      };
      if (!response.ok || !data.route) throw new Error(data.message || "Rota indisponível.");
      if (id !== requestRef.current) return;
      const resolvedRoute: MobilityRoute = {
        ...data.route,
        fare: data.fare ?? null,
        fares: data.fares ?? (data.fare ? { [serviceType]: data.fare } : {}),
        fareStatus: data.fareStatus ?? "TARIFF_NOT_CONFIGURED",
      };
      routeRef.current = resolvedRoute;
      setDisplayRoute(resolvedRoute);
      const map = mapRef.current;
      const source = map?.getSource("marka-route") as GeoJSONSource | undefined;
      source?.setData({ type: "Feature", properties: {}, geometry: resolvedRoute.geometry });
      const coordinates = resolvedRoute.geometry.coordinates;
      if (map && map.isStyleLoaded() && coordinates.length) {
        const bounds = coordinates.reduce(
          (value, coordinate) => value.extend(coordinate as [number, number]),
          new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
        );
        map.fitBounds(bounds, {
          padding: { top: 104, right: 44, bottom: Math.min(260, Math.round(window.innerHeight * 0.32)), left: 44 },
          maxZoom: 16,
          duration: 250,
        });
      }
      onRouteChange?.(resolvedRoute);
      onRouteStatusChange?.({ state: "ready", message: "Rota calculada. A tarifa foi validada no servidor." });
      setRouteError(null);
      setStatus("Rota calculada.");
    } catch (error) {
      if (id === requestRef.current) {
        routeRef.current = null;
        setDisplayRoute(null);
        (mapRef.current?.getSource("marka-route") as GeoJSONSource | undefined)?.setData({
          type: "FeatureCollection",
          features: [],
        });
        onRouteChange?.(null);
        const message = error instanceof Error && error.name === "TimeoutError"
          ? "O cálculo da rota demorou mais do que o esperado. Verifique a ligação e tente novamente."
          : error instanceof Error ? error.message : "Falha ao calcular a rota.";
        setRouteError(message);
        setStatus(message);
        onRouteStatusChange?.({ state: "error", message });
      }
    } finally {
      if (id === requestRef.current) setBusy(false);
    }
  }, [onRouteChange, onRouteStatusChange, serviceType, serviceTypes]);

  useEffect(() => {
    // Route and fare calculation is independent from map initialization and WebGL.
    requestRef.current += 1;
    if (originPoint && destinationPoint) {
      const routeTimer = window.setTimeout(() => {
        void calculateRoute(originPoint, destinationPoint);
      }, 0);
      return () => window.clearTimeout(routeTimer);
    }
    routeRef.current = null;
    onRouteChange?.(null);
    onRouteStatusChange?.({
      state: "idle",
      message: !originPoint ? "Defina o ponto de partida." : "Selecione um destino para calcular a rota.",
    });
    const resetTimer = window.setTimeout(() => {
      setDisplayRoute(null);
      setBusy(false);
      setStatus("Defina a partida e o destino para calcular a rota.");
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [
    originPoint?.lat,
    originPoint?.lon,
    originPoint?.label,
    destinationPoint?.lat,
    destinationPoint?.lon,
    destinationPoint?.label,
    calculateRoute,
    onRouteChange,
    onRouteStatusChange,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    markersRef.current.pickup?.remove();
    markersRef.current.dropoff?.remove();
    markersRef.current.pickup = originPoint
      ? new maplibregl.Marker({ element: markerElement("pickup") }).setLngLat([originPoint.lon, originPoint.lat]).addTo(map)
      : null;
    markersRef.current.dropoff = destinationPoint
      ? new maplibregl.Marker({ element: markerElement("dropoff") }).setLngLat([destinationPoint.lon, destinationPoint.lat]).addTo(map)
      : null;
    if (!originPoint || !destinationPoint) {
      (map.getSource("marka-route") as GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features: [],
      });
      const focus = originPoint || destinationPoint;
      if (focus) map.flyTo({ center: [focus.lon, focus.lat], zoom: 15, duration: 650 });
    }
  }, [
    originPoint?.lat,
    originPoint?.lon,
    originPoint?.label,
    destinationPoint?.lat,
    destinationPoint?.lon,
    destinationPoint?.label,
    mapReady,
  ]);

  useEffect(() => {
    driverRouteRef.current = driverRouteGeometry;
    const source = mapReady ? mapRef.current?.getSource("marka-driver-route") as GeoJSONSource | undefined : undefined;
    source?.setData(driverRouteGeometry
      ? { type: "Feature", properties: {}, geometry: driverRouteGeometry }
      : { type: "FeatureCollection", features: [] });
  }, [driverRouteGeometry, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!driverPoint) {
      if (driverAnimationRef.current !== null) cancelAnimationFrame(driverAnimationRef.current);
      driverAnimationRef.current = null;
      markersRef.current.driver?.remove();
      markersRef.current.driver = null;
      return;
    }
    if (!markersRef.current.driver) {
      markersRef.current.driver = new maplibregl.Marker({
        element: markerElement("driver"),
        className: "marka-driver-marker",
        rotationAlignment: "map",
      }).setLngLat([driverPoint.lon, driverPoint.lat]).addTo(map);
    } else {
      if (driverAnimationRef.current !== null) cancelAnimationFrame(driverAnimationRef.current);
      const marker = markersRef.current.driver;
      const start = marker.getLngLat();
      const target = { lng: driverPoint.lon, lat: driverPoint.lat };
      const distance = Math.hypot(target.lng - start.lng, target.lat - start.lat);
      const duration = Math.min(6500, Math.max(900, distance * 111_000 / 8 * 1000));
      const startedAt = performance.now();
      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        marker.setLngLat([
          start.lng + (target.lng - start.lng) * eased,
          start.lat + (target.lat - start.lat) * eased,
        ]);
        if (progress < 1) driverAnimationRef.current = requestAnimationFrame(animate);
        else driverAnimationRef.current = null;
      };
      driverAnimationRef.current = requestAnimationFrame(animate);
    }
    markersRef.current.driver.setRotation(Number.isFinite(driverPoint.bearing) ? Number(driverPoint.bearing) : 0);
  }, [driverPoint?.lat, driverPoint?.lon, driverPoint?.bearing, mapReady]);

  return (
    <div className="marka-mobility-map absolute inset-0 z-0 h-full w-full bg-transparent">
      {mapError && !leafletFailed ? (
        <LeafletRouteFallback
          route={displayRoute?.geometry ?? null}
          origin={originPoint}
          destination={destinationPoint}
          driverRoute={driverRouteGeometry}
          driver={driverPoint}
          onFailure={() => setLeafletFailed(true)}
          onMapDestinationSelect={(point) => mapDestinationSelectRef.current?.(point)}
        />
      ) : null}
      {leafletFailed && (
        <div role="alert" className="absolute inset-0 z-20 grid place-items-center bg-[#101318] px-6 text-center">
          <div className="w-full max-w-sm rounded-2xl border border-rose-300/20 bg-[#0d0d0f]/90 p-5 shadow-2xl backdrop-blur-xl">
            <p className="text-sm font-semibold text-white">Mapa indisponível</p>
            <p className="mt-2 text-xs leading-5 text-white/60">
              Não foi possível carregar o mapa rodoviário. A MARKA não vai substituir o mapa real por um desenho ilustrativo. Verifique a ligação e tente novamente.
            </p>
            <p className="mt-2 text-[10px] leading-4 text-white/40">
              Também pode pesquisar os endereços manualmente. O pedido só avança quando a rota e a tarifa forem confirmadas.
            </p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-11 w-full rounded-xl bg-[#c8a24a] px-4 text-xs font-bold text-[#17130a]">
              Tentar carregar novamente
            </button>
          </div>
        </div>
      )}
      <div ref={hostRef} className={"absolute inset-0 " + (mapError ? "invisible" : "")} role="application" aria-label="Mapa de mobilidade MARKA" />
      {showStatus && <div className="absolute left-4 right-4 top-[76px] z-10 ml-auto max-w-[min(78vw,360px)] rounded-xl border border-white/10 bg-[#141417]/90 px-3 py-2 text-[10px] text-white/65 shadow-xl backdrop-blur-lg" role={routeError ? "alert" : "status"} aria-live="polite">
        <span className={"mr-1.5 inline-block h-1.5 w-1.5 rounded-full " + (routeError ? "bg-rose-400" : busy ? "animate-pulse bg-amber-300" : "bg-[#E5B84B]")} />
        {busy ? "A calcular rota…" : status}
        {routeError && originPoint && destinationPoint && (
          <button
            type="button"
            onClick={() => void calculateRoute(originPoint, destinationPoint)}
            disabled={busy}
            className="ml-2 rounded-lg border border-[#E5B84B]/40 px-2 py-1 font-semibold text-[#F2CF78] disabled:opacity-50"
          >
            Tentar novamente
          </button>
        )}
      </div>}
      
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#09090B]/35 via-[#09090B]/10 to-transparent" />
    </div>
  );
}
