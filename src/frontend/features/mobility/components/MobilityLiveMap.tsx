"use client";
import { useEffect, useRef, useState } from "react";
declare global { interface Window { L?: any } }
type Point = { lat: number; lon: number; label: string };
const CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
function loadLeaflet(): Promise<any> {
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
export default function MobilityLiveMap() {
  const hostRef = useRef<HTMLDivElement>(null), mapRef = useRef<any>(null), routeRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [origin, setOrigin] = useState<Point | null>(null), [destination, setDestination] = useState<Point | null>(null);
  const [destinationText, setDestinationText] = useState(""), [routeSummary, setRouteSummary] = useState("");
  const [status, setStatus] = useState("Ative o GPS ou pesquise um destino para calcular a rota."), [busy, setBusy] = useState(false);
  useEffect(() => {
    let disposed = false;
    loadLeaflet().then((L) => {
      if (disposed || !hostRef.current || mapRef.current) return;
      const map = L.map(hostRef.current).setView([-8.8383, 13.2344], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors' }).addTo(map);
      mapRef.current = map; window.setTimeout(() => map.invalidateSize(), 100);
    }).catch((e) => setStatus(e instanceof Error ? e.message : "Erro ao iniciar o mapa."));
    return () => { disposed = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; routeRef.current = null; markersRef.current = []; } };
  }, []);
  function setPoint(point: Point, kind: "origin" | "destination") {
    const L = window.L, map = mapRef.current; if (!L || !map) return;
    if (kind === "origin") setOrigin(point); else setDestination(point);
    markersRef.current.push(L.marker([point.lat, point.lon]).addTo(map).bindPopup(point.label));
    map.setView([point.lat, point.lon], 15);
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
    setBusy(true); setStatus("A calcular o percurso pelas estradas…");
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=false`);
      if (!response.ok) throw new Error("O serviço de rotas está temporariamente indisponível.");
      const payload = await response.json(), route = payload?.routes?.[0];
      if (!route?.geometry?.coordinates?.length) throw new Error("Não foi encontrada uma rota rodoviária entre estes pontos.");
      if (routeRef.current) routeRef.current.remove();
      routeRef.current = window.L.geoJSON(route.geometry, { style: { color: "#e9bd58", weight: 5, opacity: .95 } }).addTo(mapRef.current);
      mapRef.current.fitBounds(routeRef.current.getBounds(), { padding: [24, 24] });
      setRouteSummary(`${(route.distance / 1000).toLocaleString("pt-AO", { maximumFractionDigits: 1 })} km · cerca de ${Math.max(1, Math.round(route.duration / 60))} min`);
      setStatus("Percurso rodoviário calculado com OSRM.");
    } catch (e) { setStatus(e instanceof Error ? e.message : "Falha ao calcular o percurso."); }
    finally { setBusy(false); }
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
      await calculateRoute(origin, point);
    } catch (e) { setStatus(e instanceof Error ? e.message : "Falha na pesquisa do destino."); setBusy(false); }
  }
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#080d12]">
    <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">
      <button type="button" onClick={locateMe} disabled={busy} className="rounded-full border border-[#e9bd58]/60 px-3 py-2 text-xs font-semibold text-[#f2cd70] disabled:opacity-50">{busy ? "A processar…" : "⌖ Usar GPS"}</button>
      <input value={destinationText} onChange={(e) => setDestinationText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchDestination(); }} placeholder="Destino, bairro ou referência" aria-label="Pesquisar destino" className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#e9bd58]/70" />
      <button type="button" onClick={searchDestination} disabled={busy} className="rounded-full bg-[#e9bd58] px-4 py-2 text-xs font-bold text-[#17130a] disabled:opacity-50">Pesquisar</button>
    </div>
    <div ref={hostRef} role="application" aria-label="Mapa interativo OpenStreetMap" className="h-64 w-full bg-[#101820] sm:h-80" />
    <div className="space-y-1 p-3 text-xs text-white/65"><p aria-live="polite">{status}</p>{routeSummary && <p className="font-semibold text-[#f2cd70]">Percurso: {routeSummary}</p>}<p className="text-[10px] text-white/35">OpenStreetMap · Nominatim · OSRM. Serviços públicos gratuitos sujeitos a limites de utilização.</p></div>
  </section>;
}
