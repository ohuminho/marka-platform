"use client";

import { useEffect, useRef, useState } from "react";

type Coordinate = { lat: number; lng: number };
type MapLayer = { addTo(map: MapInstance): MapLayer; remove(): void; getBounds?(): unknown };
type MapInstance = {
  setView(center: [number, number], zoom: number): MapInstance;
  fitBounds(bounds: unknown, options?: { padding: [number, number] }): void;
  invalidateSize(): void;
  remove(): void;
};
type MarkerLayer = MapLayer & { bindPopup(content: string): MarkerLayer };
const CSS_URLS = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
];
const JS_URLS = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
];
let tripMapStylesPromise: Promise<void> | null = null;
let tripMapLeafletPromise: Promise<NonNullable<Window["L"]>> | null = null;

function getLeaflet(): NonNullable<Window["L"]> | undefined {
  return (window as Window).L;
}

function loadStylesheet(): Promise<void> {
  if (document.querySelector('link[data-marka-leaflet="true"][data-loaded="true"]')) return Promise.resolve();
  if (tripMapStylesPromise) return tripMapStylesPromise;
  tripMapStylesPromise = new Promise<void>((resolve, reject) => {
    let index = 0;
    const attempt = () => {
      const existing = document.querySelector<HTMLLinkElement>('link[data-marka-leaflet="true"]');
      if (existing && existing.dataset.loaded !== "true") {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => { existing.remove(); index += 1; index < CSS_URLS.length ? attempt() : reject(new Error("Estilos do mapa indisponíveis.")); }, { once: true });
        return;
      }
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS_URLS[index];
      link.dataset.markaLeaflet = "true";
      link.onload = () => { link.dataset.loaded = "true"; resolve(); };
      link.onerror = () => {
        link.remove();
        index += 1;
        if (index < CSS_URLS.length) attempt();
        else reject(new Error("Estilos do mapa indisponíveis."));
      };
      document.head.appendChild(link);
    };
    attempt();
  }).catch((error: unknown) => { tripMapStylesPromise = null; throw error; });
  return tripMapStylesPromise;
}

function loadLeaflet(): Promise<NonNullable<Window["L"]>> {
  const loaded = getLeaflet();
  if (loaded) return Promise.resolve(loaded);
  if (tripMapLeafletPromise) return tripMapLeafletPromise;
  tripMapLeafletPromise = (async () => {
    await loadStylesheet();
    for (const src of JS_URLS) {
      try {
        const existing = document.querySelector<HTMLScriptElement>('script[data-marka-leaflet="true"]');
        if (existing?.dataset.failed === "true") existing.remove();
        const active = document.querySelector<HTMLScriptElement>('script[data-marka-leaflet="true"]');
        if (active) {
          const alreadyLoaded = getLeaflet();
          if (alreadyLoaded) return alreadyLoaded;
          if (active.dataset.loaded === "true") {
            active.remove();
          } else {
            await new Promise<void>((resolve, reject) => {
              active.addEventListener("load", () => resolve(), { once: true });
              active.addEventListener("error", () => reject(new Error("Motor do mapa indisponível.")), { once: true });
            });
            const afterLoad = getLeaflet();
            if (afterLoad) return afterLoad;
            active.remove();
          }
        }
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = src;
          script.async = true;
          script.dataset.markaLeaflet = "true";
          script.onload = () => { script.dataset.loaded = "true"; resolve(); };
          script.onerror = () => { script.dataset.failed = "true"; script.remove(); reject(new Error("CDN Leaflet indisponível.")); };
          document.head.appendChild(script);
        });
        const leaflet = getLeaflet();
        if (leaflet) return leaflet;
      } catch {
        // Continua para o CDN alternativo.
      }
    }
    throw new Error("Não foi possível carregar o motor do mapa. Verifique a ligação e tente novamente.");
  })().catch((error: unknown) => { tripMapLeafletPromise = null; throw error; });
  return tripMapLeafletPromise;
}

export default function MobilityTripMap({ pickup, dropoff, driver }: { pickup: Coordinate | null; dropoff: Coordinate | null; driver: Coordinate | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const layersRef = useRef<MapLayer[]>([]);
  const driverLayerRef = useRef<MarkerLayer | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    void loadLeaflet().then((L) => {
      if (disposed || !hostRef.current || mapRef.current) return;
      const map = L.map(hostRef.current).setView([-8.8383, 13.2344], 12);
      const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';
      const baseTiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20, attribution,
      }).addTo(map);
      let tileFallbackActivated = false;
      baseTiles.on("tileerror", () => {
        if (tileFallbackActivated || !mapRef.current) return;
        tileFallbackActivated = true;
        baseTiles.remove();
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
      });
      mapRef.current = map;
      setReady(true);
      if (hostRef.current && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => map.invalidateSize());
        resizeObserver.observe(hostRef.current);
      }
      window.setTimeout(() => map.invalidateSize?.(), 120);
    }).catch((error) => {
      if (!disposed) setMapError(error instanceof Error ? error.message : "Não foi possível carregar o mapa.");
    });
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      driverLayerRef.current?.remove();
      driverLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const L = getLeaflet();
    if (!ready || !mapRef.current || !L) return;
    const map = mapRef.current;
    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];

    if (pickup) {
      const marker = L.circleMarker([pickup.lat, pickup.lng], {
        radius: 8, color: "#07110D", weight: 3, fillColor: "#83D4A7", fillOpacity: 1,
      }).addTo(map) as MarkerLayer;
      layersRef.current.push(marker.bindPopup("Ponto de recolha"));
    }
    if (dropoff) {
      const marker = L.circleMarker([dropoff.lat, dropoff.lng], {
        radius: 8, color: "#171208", weight: 3, fillColor: "#E9BD58", fillOpacity: 1,
      }).addTo(map) as MarkerLayer;
      layersRef.current.push(marker.bindPopup("Destino"));
    }
    let cancelled = false;
    const fitKnownPoints = () => {
      const coords = [pickup, dropoff].filter((point): point is Coordinate => Boolean(point));
      if (coords.length === 1) map.setView([coords[0].lat, coords[0].lng], 15);
      else if (coords.length > 1) {
        const bounds = L.geoJSON({
          type: "MultiPoint",
          coordinates: coords.map((point) => [point.lng, point.lat]),
        });
        const boundsLayer = bounds as MapLayer;
        if (boundsLayer.getBounds) map.fitBounds(boundsLayer.getBounds(), { padding: [44, 44] });
      }
    };

    if (pickup && dropoff) {
      void fetch(`https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson&steps=false`)
        .then(async (response) => {
          if (!response.ok) throw new Error("Rota indisponível");
          return response.json() as Promise<{ routes?: Array<{ geometry?: unknown }> }>;
        })
        .then((payload) => {
          if (cancelled) return;
          const geometry = payload.routes?.[0]?.geometry;
          if (!geometry) { fitKnownPoints(); return; }
          const route = L.geoJSON(geometry, { style: { color: "#E9BD58", weight: 5, opacity: .9 } }).addTo(map);
          layersRef.current.push(route);
          if (route.getBounds) map.fitBounds(route.getBounds(), { padding: [44, 44] });
          else fitKnownPoints();
        })
        .catch(() => { if (!cancelled) fitKnownPoints(); });
    } else fitKnownPoints();

    return () => { cancelled = true; };
  }, [ready, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  useEffect(() => {
    const L = getLeaflet();
    const map = mapRef.current;
    if (!ready || !map || !L) return;

    driverLayerRef.current?.remove();
    driverLayerRef.current = null;
    if (!driver) return;

    const marker = L.circleMarker([driver.lat, driver.lng], {
      radius: 9, color: "#07111D", weight: 3, fillColor: "#78B8FF", fillOpacity: 1,
    }).addTo(map) as MarkerLayer;
    driverLayerRef.current = marker.bindPopup("Localização comunicada pelo motorista");

    if (!pickup && !dropoff) map.setView([driver.lat, driver.lng], 15);
    return () => {
      driverLayerRef.current?.remove();
      driverLayerRef.current = null;
    };
  }, [ready, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, driver?.lat, driver?.lng]);

  return (
    <section className="relative mb-5 overflow-hidden rounded-2xl border border-white/[.09] bg-[#0B1017]">
      <div className="absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-full border border-white/[.12] bg-[#0B1017]/90 px-3 py-2 text-[9px] font-bold uppercase tracking-[.16em] text-white/65 backdrop-blur-xl">
        <span className="h-1.5 w-1.5 rounded-full bg-[#E9BD58]"/> Mapa da viagem
      </div>
      <div ref={hostRef} role="application" aria-label="Mapa do percurso da viagem" className="h-[240px] w-full bg-[#101820] sm:h-[320px]"/>
      {mapError && <div className="absolute inset-x-3 bottom-3 z-[500] rounded-xl border border-rose-300/20 bg-[#0B1017]/90 px-3 py-2 text-[10px] text-rose-100">{mapError}</div>}
      {!mapError && !pickup && !dropoff && <div className="absolute inset-x-3 bottom-3 z-[500] rounded-xl border border-white/10 bg-[#0B1017]/85 px-3 py-2 text-[10px] text-white/55">A aguardar coordenadas do percurso.</div>}
    </section>
  );
}
