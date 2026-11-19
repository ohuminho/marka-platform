"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type Marker, type StyleSpecification } from "maplibre-gl";

export type MobilityMapPoint = { lat: number; lon: number; label: string };
export type MobilityRoute = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  fare?: { currency: string; totalMinor: string; totalAOA: number } | null;
  fares?: Record<string, { currency: string; totalMinor: string; totalAOA: number } | null>;
  fareStatus?: string;
};

type Props = {
  /** Backward-compatible callback for legacy MobilityExperience callers. */
  onPointsChange?: (points: { origin: MobilityMapPoint | null; destination: MobilityMapPoint | null }) => void;
  onRouteChange?: (route: MobilityRoute | null) => void;
  serviceType?: string;
  serviceTypes?: string;
  driverPoint?: { lat: number; lon: number; bearing?: number | null } | null;
  driverRouteGeometry?: MobilityRoute["geometry"] | null;
  originPoint?: MobilityMapPoint | null;
  destinationPoint?: MobilityMapPoint | null;
};

const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "marka-fallback-raster": {
      type: "raster",
      tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [{ id: "marka-fallback-raster-layer", type: "raster", source: "marka-fallback-raster" }],
};

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

function tuneDarkStyle(map: MapLibreMap) {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", "#0B0D10");
      } else if (layer.type === "fill" && /(water|ocean|river|lake)/.test(id)) {
        map.setPaintProperty(layer.id, "fill-color", "#0B0D10");
      } else if (layer.type === "line" && /(road|street|highway|transportation)/.test(id)) {
        map.setPaintProperty(layer.id, "line-color", "#1E2229");
      } else if (layer.type === "fill" && /(building)/.test(id)) {
        map.setPaintProperty(layer.id, "fill-color", "#14171C");
      }
    } catch {
      // A style layer may not expose the paint property we are tuning.
    }
  }
}

export default function MobilityLiveMap({
  onRouteChange,
  serviceType = "TAXI",
  serviceTypes = serviceType,
  driverPoint = null,
  driverRouteGeometry = null,
  originPoint = null,
  destinationPoint = null,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
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
  const [routeError, setRouteError] = useState<string | null>(null);\n  const [mapReady, setMapReady] = useState(false);\n  const fallbackStyleRef = useRef(false);

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: hostRef.current,
      style: STYLE_URL,
      center: [13.23, -8.83],
      zoom: 11,
      attributionControl: {},
      cooperativeGestures: true,
      pitchWithRotate: false,
      dragRotate: false,
      maxPitch: 0,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("style.load", () => {
      setMapReady(true);
      tuneDarkStyle(map);
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
    });
    map.on("error", (event) => {
      if (!event.error?.message) return;
      if (!fallbackStyleRef.current) {
        fallbackStyleRef.current = true;
        setMapError("O mapa principal está indisponível. A MARKA mudou para o mapa alternativo.");
        map.setStyle(FALLBACK_STYLE);
      } else {
        setMapError("O fornecedor de mapas está temporariamente indisponível. A rota e os endereços continuam disponíveis.");
      }
    });
    mapRef.current = map;
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(hostRef.current);
    return () => {
      resize.disconnect();
      if (driverAnimationRef.current !== null) cancelAnimationFrame(driverAnimationRef.current);
      Object.values(markersRef.current).forEach((marker) => marker?.remove());
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  const calculateRoute = useCallback(async (from: MobilityMapPoint, to: MobilityMapPoint) => {
    const id = ++requestRef.current;
    setBusy(true);
    setRouteError(null);
    setStatus("A calcular a rota rodoviária…");
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
      const map = mapRef.current;
      const source = map?.getSource("marka-route") as GeoJSONSource | undefined;
      source?.setData({ type: "Feature", properties: {}, geometry: resolvedRoute.geometry });
      const coordinates = resolvedRoute.geometry.coordinates;
      if (map && coordinates.length) {
        const bounds = coordinates.reduce(
          (value, coordinate) => value.extend(coordinate as [number, number]),
          new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
        );
        map.fitBounds(bounds, {
          padding: { top: 112, right: 58, bottom: 340, left: 58 },
          maxZoom: 16,
          duration: 850,
        });
      }
      onRouteChange?.(resolvedRoute);
      setRouteError(null);
      setStatus("Rota calculada.");
    } catch (error) {
      if (id === requestRef.current) {
        routeRef.current = null;
        onRouteChange?.(null);
        const message = error instanceof Error ? error.message : "Falha ao calcular a rota.";
        setRouteError(message);
        setStatus(message);
      }
    } finally {
      if (id === requestRef.current) setBusy(false);
    }
  }, [onRouteChange, serviceType, serviceTypes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    requestRef.current += 1;

    markersRef.current.pickup?.remove();
    markersRef.current.dropoff?.remove();
    markersRef.current.pickup = originPoint
      ? new maplibregl.Marker({ element: markerElement("pickup") }).setLngLat([originPoint.lon, originPoint.lat]).addTo(map)
      : null;
    markersRef.current.dropoff = destinationPoint
      ? new maplibregl.Marker({ element: markerElement("dropoff") }).setLngLat([destinationPoint.lon, destinationPoint.lat]).addTo(map)
      : null;

    if (originPoint && destinationPoint) {
      const routeTimer = window.setTimeout(() => {
        void calculateRoute(originPoint, destinationPoint);
      }, 0);
      return () => window.clearTimeout(routeTimer);
    } else {
      routeRef.current = null;
      (map.getSource("marka-route") as GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features: [],
      });
      onRouteChange?.(null);
      const focus = originPoint || destinationPoint;
      if (focus) map.flyTo({ center: [focus.lon, focus.lat], zoom: 15, duration: 650 });
      const resetStatus = () => {
        setBusy(false);
        setStatus("Defina a partida e o destino para calcular a rota.");
      };
      map.once("idle", resetStatus);
      map.triggerRepaint();
      return () => { map.off("idle", resetStatus); };
    }
  }, [
    originPoint?.lat,
    originPoint?.lon,
    originPoint?.label,
    destinationPoint?.lat,
    destinationPoint?.lon,
    destinationPoint?.label,
    calculateRoute,
    onRouteChange,
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
    <div className="marka-mobility-map absolute inset-0">
      <div ref={hostRef} className="absolute inset-0" role="application" aria-label="Mapa de mobilidade MARKA" />
      <div className="absolute left-4 right-4 top-[76px] z-10 ml-auto max-w-[min(78vw,360px)] rounded-xl border border-white/10 bg-[#141417]/90 px-3 py-2 text-[10px] text-white/65 shadow-xl backdrop-blur-lg" role={routeError ? "alert" : "status"} aria-live="polite">
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
      </div>
      {mapError && (
        <p role="alert" className="absolute left-4 top-20 z-10 rounded-xl border border-rose-200/15 bg-[#141417]/90 p-3 text-[10px] text-rose-100">
          {mapError}
        </p>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#09090B] via-[#09090B]/55 to-transparent" />
    </div>
  );
}
