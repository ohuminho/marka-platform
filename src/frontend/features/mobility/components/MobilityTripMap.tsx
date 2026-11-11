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
type Leaflet = {
  map(element: HTMLElement): MapInstance;
  tileLayer(url: string, options?: { maxZoom?: number; attribution?: string }): MapLayer;
  marker(position: [number, number]): MarkerLayer;
  circleMarker(position: [number, number], options: Record<string, unknown>): MarkerLayer;
  geoJSON(data: unknown, options?: { style?: { color: string; weight: number; opacity: number } }): MapLayer;
};
declare global { interface Window { L?: Leaflet } }

const CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet(): Promise<Leaflet> {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    if (!document.querySelector('link[data-marka-leaflet="true"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS_URL;
      link.dataset.markaLeaflet = "true";
      document.head.appendChild(link);
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-marka-leaflet="true"]');
    if (existing) {
      existing.addEventListener("load", () => window.L ? resolve(window.L) : reject(new Error("Motor do mapa indisponível.")), { once: true });
      existing.addEventListener("error", () => reject(new Error("Não foi possível carregar o mapa.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = JS_URL;
    script.async = true;
    script.dataset.markaLeaflet = "true";
    script.onload = () => window.L ? resolve(window.L) : reject(new Error("Motor do mapa indisponível."));
    script.onerror = () => reject(new Error("Não foi possível carregar o mapa."));
    document.head.appendChild(script);
  });
}

export default function MobilityTripMap({ pickup, dropoff, driver }: { pickup: Coordinate | null; dropoff: Coordinate | null; driver: Coordinate | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const layersRef = useRef<MapLayer[]>([]);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    void loadLeaflet().then((L) => {
      if (disposed || !hostRef.current || mapRef.current) return;
      const map = L.map(hostRef.current).setView([-8.8383, 13.2344], 12);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
      }).addTo(map);
      mapRef.current = map;
      setReady(true);
      window.setTimeout(() => map.invalidateSize?.(), 120);
    }).catch((error) => {
      if (!disposed) setMapError(error instanceof Error ? error.message : "Não foi possível carregar o mapa.");
    });
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.L) return;
    const map = mapRef.current;
    const L = window.L;
    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];

    if (pickup) {
      layersRef.current.push(L.circleMarker([pickup.lat, pickup.lng], {
        radius: 8, color: "#07110D", weight: 3, fillColor: "#83D4A7", fillOpacity: 1,
      }).addTo(map).bindPopup("Ponto de recolha"));
    }
    if (dropoff) {
      layersRef.current.push(L.circleMarker([dropoff.lat, dropoff.lng], {
        radius: 8, color: "#171208", weight: 3, fillColor: "#E9BD58", fillOpacity: 1,
      }).addTo(map).bindPopup("Destino"));
    }
    if (driver) {
      layersRef.current.push(L.circleMarker([driver.lat, driver.lng], {
        radius: 9, color: "#07111D", weight: 3, fillColor: "#78B8FF", fillOpacity: 1,
      }).addTo(map).bindPopup("Localização comunicada pelo motorista"));
    }

    let cancelled = false;
    const fitKnownPoints = () => {
      const coords = [pickup, dropoff, driver].filter((point): point is Coordinate => Boolean(point));
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
