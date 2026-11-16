"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type Marker } from "maplibre-gl";

export type MobilityMapPoint = { lat: number; lon: number; label: string };
export type MobilityRoute = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  fare?: { currency: string; totalMinor: string; totalAOA: number } | null;
  fareStatus?: string;
};

type Props = {
  onPointsChange?: (points: { origin: MobilityMapPoint | null; destination: MobilityMapPoint | null }) => void;
  onRouteChange?: (route: MobilityRoute | null) => void;
  serviceType?: string;
  driverPoint?: { lat: number; lon: number; bearing?: number | null } | null;
  originPoint?: MobilityMapPoint | null;
  destinationPoint?: MobilityMapPoint | null;
};

const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

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
  onPointsChange,
  onRouteChange,
  serviceType = "TAXI",
  driverPoint = null,
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
  const routeRef = useRef<MobilityRoute | null>(null);
  const serviceRef = useRef(serviceType);
  const [origin, setOrigin] = useState<MobilityMapPoint | null>(null);
  const [destination, setDestination] = useState<MobilityMapPoint | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Defina a partida e o destino para calcular a rota.");
  const [mapError, setMapError] = useState<string | null>(null);

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
    map.on("load", () => {
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
      if (event.error?.message) setMapError("O mapa não conseguiu carregar os tiles. Verifique a ligação.");
    });
    mapRef.current = map;
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(hostRef.current);
    return () => {
      resize.disconnect();
      Object.values(markersRef.current).forEach((marker) => marker?.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const calculateRoute = useCallback(async (from: MobilityMapPoint, to: MobilityMapPoint) => {
    const id = ++requestRef.current;
    setBusy(true);
    setStatus("A calcular a rota rodoviária…");
    try {
      const query = new URLSearchParams({
        originLat: String(from.lat),
        originLng: String(from.lon),
        destinationLat: String(to.lat),
        destinationLng: String(to.lon),
        serviceType,
      });
      const response = await fetch("/api/mobility/routing/geometry?" + query.toString(), {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json() as {
        route?: MobilityRoute;
        fare?: { currency: string; totalMinor: string; totalAOA: number } | null;
        fareStatus?: string;
        message?: string;
      };
      if (!response.ok || !data.route) throw new Error(data.message || "Rota indisponível.");
      if (id !== requestRef.current) return;
      const resolvedRoute: MobilityRoute = {
        ...data.route,
        fare: data.fare ?? null,
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
      setStatus("Rota calculada.");
    } catch (error) {
      if (id === requestRef.current) {
        onRouteChange?.(null);
        setStatus(error instanceof Error ? error.message : "Falha ao calcular a rota.");
      }
    } finally {
      if (id === requestRef.current) setBusy(false);
    }
  }, [onRouteChange, serviceType]);

  const setPoint = useCallback((point: MobilityMapPoint, kind: "pickup" | "dropoff") => {
    const map = mapRef.current;
    if (!map) return;
    requestRef.current += 1;
    const nextOrigin = kind === "pickup" ? point : origin;
    const nextDestination = kind === "dropoff" ? point : destination;
    if (kind === "pickup") setOrigin(point);
    else setDestination(point);

    markersRef.current[kind]?.remove();
    markersRef.current[kind] = new maplibregl.Marker({ element: markerElement(kind) })
      .setLngLat([point.lon, point.lat])
      .addTo(map);
    onPointsChange?.({ origin: nextOrigin, destination: nextDestination });

    if (nextOrigin && nextDestination) {
      void calculateRoute(nextOrigin, nextDestination);
    } else {
      routeRef.current = null;
      onRouteChange?.(null);
      (map.getSource("marka-route") as GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features: [],
      });
      map.flyTo({ center: [point.lon, point.lat], zoom: 15, duration: 650 });
    }
  }, [calculateRoute, destination, onPointsChange, onRouteChange, origin]);

  useEffect(() => {
    if (originPoint && (originPoint.lat !== origin?.lat || originPoint.lon !== origin?.lon)) {
      setPoint(originPoint, "pickup");
    }
  }, [originPoint?.lat, originPoint?.lon, origin?.lat, origin?.lon, setPoint]);

  useEffect(() => {
    if (destinationPoint && (destinationPoint.lat !== destination?.lat || destinationPoint.lon !== destination?.lon)) {
      setPoint(destinationPoint, "dropoff");
    }
  }, [destinationPoint?.lat, destinationPoint?.lon, destination?.lat, destination?.lon, setPoint]);

  useEffect(() => {
    if (destinationPoint || !destination) return;
    requestRef.current += 1;
    setDestination(null);
    markersRef.current.dropoff?.remove();
    markersRef.current.dropoff = null;
    routeRef.current = null;
    (mapRef.current?.getSource("marka-route") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: [],
    });
    onPointsChange?.({ origin, destination: null });
    onRouteChange?.(null);
  }, [destinationPoint, destination, origin, onPointsChange, onRouteChange]);

  useEffect(() => {
    if (originPoint || !origin) return;
    requestRef.current += 1;
    setOrigin(null);
    markersRef.current.pickup?.remove();
    markersRef.current.pickup = null;
    routeRef.current = null;
    (mapRef.current?.getSource("marka-route") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: [],
    });
    onPointsChange?.({ origin: null, destination });
    onRouteChange?.(null);
  }, [originPoint, origin, destination, onPointsChange, onRouteChange]);

  useEffect(() => {
    if (serviceRef.current !== serviceType) {
      serviceRef.current = serviceType;
      if (origin && destination) void calculateRoute(origin, destination);
    }
  }, [serviceType, origin, destination, calculateRoute]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!driverPoint) {
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
      markersRef.current.driver.setLngLat([driverPoint.lon, driverPoint.lat]);
    }
    markersRef.current.driver.setRotation(Number.isFinite(driverPoint.bearing) ? Number(driverPoint.bearing) : 0);
  }, [driverPoint?.lat, driverPoint?.lon, driverPoint?.bearing]);

  return (
    <div className="marka-mobility-map absolute inset-0">
      <div ref={hostRef} className="absolute inset-0" role="application" aria-label="Mapa de mobilidade MARKA" />
      <div className="absolute bottom-[310px] right-4 z-10 rounded-xl border border-white/10 bg-[#141417]/85 px-3 py-2 text-[9px] text-white/50 backdrop-blur-lg">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#E5B84B]" />
        {busy ? "A calcular rota…" : status}
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
