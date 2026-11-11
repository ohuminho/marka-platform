"use client";
import { useEffect, useRef, useState } from "react";

type LeafletMap = {
  setView(center: [number, number], zoom: number): LeafletMap;
  invalidateSize(): void;
  fitBounds(bounds: unknown, options?: { padding: [number, number] }): void;
  remove(): void;
};
type LeafletLayer = { remove(): void };
type LeafletMarker = LeafletLayer & {
  addTo(map: LeafletMap): LeafletMarker;
  bindPopup(content: string): LeafletMarker;
};
type LeafletLayerGroup = LeafletLayer & {
  addTo(map: LeafletMap): LeafletLayerGroup;
  getBounds(): unknown;
};
type LeafletNamespace = {
  map(element: HTMLElement): LeafletMap;
  tileLayer(url: string, options?: { maxZoom?: number; attribution?: string }): { addTo(map: LeafletMap): unknown };
  marker(position: [number, number]): LeafletMarker;
  circleMarker(position: [number, number], options?: Record<string, unknown>): LeafletMarker;
  geoJSON(data: unknown, options?: { style?: { color: string; weight: number; opacity: number } }): LeafletLayerGroup;
};
declare global { interface Window { L?: LeafletNamespace } }
type Point = { lat: number; lon: number; label: string };
const CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
function loadLeaflet(): Promise<LeafletNamespace> {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    if (!document.querySelector('link[data-marka-leaflet="true"]')) {
      const link = document.createElement("link"); link.rel = "stylesheet"; link.href = CSS_URL; link.dataset.markaLeaflet = "true"; document.head.appendChild(link);
    }
    const prior = document.querySelector<HTMLScriptElement>('script[data-marka-leaflet="true"]');
    if (prior) {
      prior.addEventListener("load", () => window.L ? resolve(window.L) : reject(new Error("Motor do mapa indisponível.")), { once: true });
      prior.addEventListener("error", () => reject(new Error("Não foi possível carregar o mapa.")), { once: true });
      if (window.L) resolve(window.L); return;
    }
    const script = document.createElement("script"); script.src = JS_URL; script.async = true; script.dataset.markaLeaflet = "true";
    script.onload = () => window.L ? resolve(window.L) : reject(new Error("Motor do mapa indisponível."));
    script.onerror = () => reject(new Error("Não foi possível carregar o mapa.")); document.head.appendChild(script);
  });
}
export default function MobilityLiveMap({ onPointsChange }: { onPointsChange?: (points: { origin: Point | null; destination: Point | null }) => void } = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const routeRef = useRef<LeafletLayerGroup | null>(null);
  const markersRef = useRef<{ origin: LeafletMarker | null; destination: LeafletMarker | null }>({ origin: null, destination: null });
  const routeRequestRef = useRef(0);
  const [origin, setOrigin] = useState<Point | null>(null), [destination, setDestination] = useState<Point | null>(null);
  const [destinationText, setDestinationText] = useState(""), [routeSummary, setRouteSummary] = useState("");
  const [status, setStatus] = useState("Ative o GPS ou pesquise um destino para calcular a rota."), [busy, setBusy] = useState(false);
  useEffect(() => {
    let disposed = false;
    loadLeaflet().then((L) => {
      if (disposed || !hostRef.current || mapRef.current) return;
      const map = L.map(hostRef.current).setView([-8.8383, 13.2344], 12);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 20, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>' }).addTo(map);
      mapRef.current = map; window.setTimeout(() => map.invalidateSize(), 100);
    }).catch((e) => setStatus(e instanceof Error ? e.message : "Erro ao iniciar o mapa."));
    return () => { disposed = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; routeRef.current = null; markersRef.current = { origin: null, destination: null }; } };
  }, []);
  function setPoint(point: Point, kind: "origin" | "destination") {
    const L = window.L, map = mapRef.current; if (!L || !map) return;
    const nextOrigin = kind === "origin" ? point : origin;
    const nextDestination = kind === "destination" ? point : destination;
    if (kind === "origin") setOrigin(point); else setDestination(point);
    onPointsChange?.({ origin: nextOrigin, destination: nextDestination });
    markersRef.current[kind]?.remove();
    markersRef.current[kind] = L.marker([point.lat, point.lon]).addTo(map).bindPopup(point.label);
    if (nextOrigin && nextDestination) {
      void calculateRoute(nextOrigin, nextDestination);
    } else {
      if (routeRef.current) { routeRef.current.remove(); routeRef.current = null; }
      setRouteSummary("");
      map.setView([point.lat, point.lon], 15);
    }
  }
  async function locateMe() {
    if (!navigator.geolocation) { setStatus("Este dispositivo não disponibiliza geolocalização."); return; }
    setBusy(true); setStatus("A obter a localização GPS do dispositivo…");
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { lat: pos.coords.latitude, lon: pos.coords.longitude, label: "A minha localização GPS" };
      setPoint(p, "origin"); setStatus("GPS obtido. Pesquise o destino para calcular o percurso."); setBusy(false);
    }, (e) => { setStatus(e.code === e.PERMISSION_DENIED ? "Permissão de localização recusada. Autorize o GPS no navegador." : "Não foi possível obter a localização. Verifique o GPS e tente novamente."); setBusy(false); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
  }
  async function calculateRoute(from: Point | null, to: Point | null) {
    if (!from || !to) { setStatus("Defina a partida por GPS e pesquise o destino para calcular a rota."); return; }
    const requestId = ++routeRequestRef.current;
    if (routeRef.current) { routeRef.current.remove(); routeRef.current = null; }
    setBusy(true); setRouteSummary(""); setStatus("A calcular o percurso pelas estradas…");
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=false`);
      if (!response.ok) throw new Error("O serviço de rotas está temporariamente indisponível.");
      const payload = (await response.json()) as {
        routes?: Array<{
          geometry?: { coordinates?: number[][] };
          distance: number;
          duration: number;
        }>;
      };
      if (requestId !== routeRequestRef.current) return;
      const route = payload.routes?.[0];
      if (!route?.geometry?.coordinates?.length) throw new Error("Não foi encontrada uma rota rodoviária entre estes pontos.");
      const leaflet = window.L;
      const map = mapRef.current;
      if (!leaflet || !map) throw new Error("O mapa ainda não está pronto. Tente novamente.");
      const routeLayer = leaflet.geoJSON(route.geometry, { style: { color: "#e9bd58", weight: 5, opacity: .95 } }).addTo(map);
      routeRef.current = routeLayer;
      map.fitBounds(routeLayer.getBounds(), { padding: [24, 24] });
      setRouteSummary(`${(route.distance / 1000).toLocaleString("pt-AO", { maximumFractionDigits: 1 })} km · cerca de ${Math.max(1, Math.round(route.duration / 60))} min`);
      setStatus("Percurso rodoviário calculado com OSRM.");
    } catch (e) {
      if (requestId === routeRequestRef.current) setStatus(e instanceof Error ? e.message : "Falha ao calcular o percurso.");
    } finally {
      if (requestId === routeRequestRef.current) setBusy(false);
    }
  }
  async function searchDestination() {
    const q = destinationText.trim(); if (!q) { setStatus("Introduza um endereço, bairro ou ponto de referência."); return; }
    setBusy(true); setStatus("A pesquisar destino no OpenStreetMap…");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ao&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Pesquisa de endereços temporariamente indisponível.");
      const rows = await response.json(); if (!Array.isArray(rows) || !rows[0]) throw new Error("Destino não encontrado. Tente um bairro ou ponto de referência.");
      const row = rows[0], point = { lat: Number(row.lat), lon: Number(row.lon), label: String(row.display_name) };
      setPoint(point, "destination"); setDestinationText(String(row.display_name).split(",").slice(0, 3).join(","));
      if (!origin) { setStatus("Destino encontrado. Ative o GPS para calcular a rota rodoviária."); setBusy(false); }
    } catch (e) { setStatus(e instanceof Error ? e.message : "Falha na pesquisa do destino."); setBusy(false); }
  }
  return <section className="relative isolate overflow-hidden rounded-[26px] border border-white/[.09] bg-[#0B1017] shadow-[0_24px_80px_-42px_rgba(0,0,0,.95)]">
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[400] h-24 bg-gradient-to-b from-[#070B10]/80 to-transparent"/>
    <div className="absolute left-3 right-3 top-3 z-[500] flex flex-col gap-2 sm:left-4 sm:right-4 sm:top-4">
      <div className="flex items-center gap-2 rounded-2xl border border-white/[.13] bg-[#0B1017]/90 p-2 shadow-[0_14px_40px_-18px_rgba(0,0,0,.9)] backdrop-blur-xl">
        <button type="button" onClick={locateMe} disabled={busy} aria-label="Usar a minha localização GPS" className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#E9BD58]/30 bg-[#E9BD58]/[.09] px-3 text-[10px] font-bold text-[#F2CD70] transition hover:bg-[#E9BD58]/[.15] disabled:opacity-50">
          <span className="text-base">⌖</span><span className="hidden sm:inline">{busy ? "A localizar…" : "GPS"}</span>
        </button>
        <input value={destinationText} onChange={(e) => setDestinationText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchDestination(); }} placeholder="Para onde vamos?" aria-label="Pesquisar destino" className="h-11 min-w-0 flex-1 bg-transparent px-2 text-xs text-white outline-none placeholder:text-white/40"/>
        <button type="button" onClick={searchDestination} disabled={busy} aria-label="Pesquisar destino" className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#E9BD58] px-4 text-[10px] font-extrabold text-[#17130A] transition hover:brightness-105 disabled:opacity-50">{busy ? "…" : "Pesquisar"}</button>
      </div>
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="rounded-full border border-white/10 bg-[#0B1017]/75 px-3 py-1.5 text-[9px] font-semibold text-white/65 backdrop-blur-lg">ANGOLA · MAPA AO VIVO</span>
        <span className="rounded-full border border-white/10 bg-[#0B1017]/75 px-3 py-1.5 text-[9px] text-white/45 backdrop-blur-lg">OpenStreetMap · CARTO</span>
      </div>
    </div>
    <div ref={hostRef} role="application" aria-label="Mapa interativo OpenStreetMap" className="h-[430px] w-full bg-[#101820] sm:h-[540px] lg:h-[min(68vh,680px)]"/>
    <div className="absolute bottom-3 left-3 right-3 z-[500] flex items-center justify-between gap-3 rounded-2xl border border-white/[.12] bg-[#0B1017]/90 px-3.5 py-3 shadow-[0_14px_40px_-18px_rgba(0,0,0,.9)] backdrop-blur-xl sm:bottom-4 sm:left-4 sm:right-4">
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[.15em] text-white/40">{routeSummary ? "Percurso estimado" : "Estado do mapa"}</p>
        <p aria-live="polite" className="mt-1 truncate text-[10px] font-medium text-white/80">{routeSummary || status}</p>
      </div>
      {routeSummary && <span className="shrink-0 rounded-xl bg-[#E9BD58]/[.1] px-3 py-2 text-[10px] font-bold text-[#F2CD70]">{routeSummary.split(" · ")[0]}</span>}
    </div>
  </section>;
}
