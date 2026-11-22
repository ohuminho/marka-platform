"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { LeafletApi, LeafletMap, LeafletLayer, LeafletMarker, LeafletTileLayer } from "leaflet";

type Point = { lat: number; lon: number; label: string };
type Geometry = { type: "LineString"; coordinates: [number, number][] };
type Props = {
  route: Geometry | null;
  origin: Point | null;
  destination: Point | null;
  driverRoute: Geometry | null;
  driver: { lat: number; lon: number; bearing?: number | null } | null;
  onFailure: () => void;
  mapPickMode?: "origin" | "destination" | null;
  onMapPointSelect?: (point: Point) => void;
};

const CARTO_TILES = "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export default function LeafletRouteFallback({ route, origin, destination, driverRoute, driver, onFailure, mapPickMode = null, onMapPointSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapPickModeRef = useRef(mapPickMode);
  const onMapPointSelectRef = useRef(onMapPointSelect);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletApi | null>(null);
  const overlaysRef = useRef<LeafletLayer[]>([]);
  const onFailureRef = useRef(onFailure);
  const [ready, setReady] = useState(false);

  useEffect(() => { onFailureRef.current = onFailure; }, [onFailure]);
  useEffect(() => {
    mapPickModeRef.current = mapPickMode;
    onMapPointSelectRef.current = onMapPointSelect;
    if (mapRef.current) mapRef.current.getContainer().style.cursor = mapPickMode ? "crosshair" : "";
  }, [mapPickMode, onMapPointSelect]);

  useEffect(() => {
    let active = true;
    let resizeObserver: ResizeObserver | null = null;
    let currentLayer: LeafletTileLayer | null = null;
    let currentLayerErrorHandler: (() => void) | null = null;
    let tileErrors = 0;
    let providerIndex = 0;
    let providerTimer: number | null = null;
    let providerTileLoaded = false;

    void import("leaflet").then((module) => {
      if (!active || !hostRef.current) return;
      const L = (module as unknown as { default?: LeafletApi }).default ?? (module as unknown as LeafletApi);
      leafletRef.current = L;
      const map = L.map(hostRef.current, {
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
        scrollWheelZoom: true,
      }).setView([-8.8383, 13.2344], 12);
      mapRef.current = map;
      map.on("click", (event) => {
        const mode = mapPickModeRef.current;
        if (!mode) return;
        onMapPointSelectRef.current?.({
          lat: event.latlng.lat,
          lon: event.latlng.lng,
          label: (mode === "origin" ? "Partida" : "Destino") + " escolhido no mapa (" +
            event.latlng.lat.toFixed(5) + ", " + event.latlng.lng.toFixed(5) + ")",
        });
      });
      map.getContainer().style.cursor = mapPickModeRef.current ? "crosshair" : "";
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Prefer the canonical OSM raster endpoint for the recovery renderer;
      // CARTO remains the secondary provider if OSM tiles are unavailable.
      const providers = [
        { url: OSM_TILES, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
        { url: CARTO_TILES, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' },
        { url: "https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, HOT' },
      ];

      const activateProvider = (index: number) => {
        if (!active) return;
        if (currentLayer && currentLayerErrorHandler) currentLayer.off("tileerror", currentLayerErrorHandler);
        if (providerTimer !== null) window.clearTimeout(providerTimer);
        providerTimer = null;
        if (currentLayer) map.removeLayer(currentLayer);
        providerIndex = index;
        tileErrors = 0;
        providerTileLoaded = false;
        const provider = providers[index];
        currentLayer = L.tileLayer(provider.url, {
          maxZoom: 19,
          attribution: provider.attribution,
          crossOrigin: true,
          updateWhenIdle: true,
          keepBuffer: 2,
        });
        currentLayerErrorHandler = () => {
          tileErrors += 1;
          if (tileErrors >= 3) {
            if (providerIndex + 1 < providers.length) activateProvider(providerIndex + 1);
            else onFailureRef.current();
          }
        };
        currentLayer.on("tileerror", currentLayerErrorHandler);
        currentLayer.on("tileload", () => {
          providerTileLoaded = true;
          if (providerTimer !== null) window.clearTimeout(providerTimer);
          providerTimer = null;
        });
        currentLayer.addTo(map);
        // Some mobile networks silently stall tile requests without emitting
        // tileerror. A watchdog ensures that a blank Leaflet canvas cannot persist.
        providerTimer = window.setTimeout(() => {
          if (providerTileLoaded || !active) return;
          if (providerIndex + 1 < providers.length) activateProvider(providerIndex + 1);
          else onFailureRef.current();
        }, 7000);
      };

      activateProvider(0);
      resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
      resizeObserver.observe(hostRef.current);
      setReady(true);
      requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    }).catch(() => {
      if (active) onFailureRef.current();
    });

    return () => {
      active = false;
      resizeObserver?.disconnect();
      if (providerTimer !== null) window.clearTimeout(providerTimer);
      overlaysRef.current.forEach((overlay) => overlay.remove?.());
      overlaysRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    overlaysRef.current.forEach((overlay) => overlay.remove?.());
    overlaysRef.current = [];
    const bounds: [number, number][] = [];

    const addMarker = (point: Point | null, kind: "pickup" | "dropoff") => {
      if (!point) return;
      const label = kind === "pickup" ? "A" : "B";
      const background = kind === "pickup" ? "#16A36A" : "#D94A4A";
      const icon = L.divIcon({
        className: "marka-leaflet-marker-shell",
        html: '<span style="display:grid;place-items:center;width:34px;height:34px;border:3px solid #fff;border-radius:50%;background:' + background + ';color:#fff;font-weight:800;box-shadow:0 3px 12px #0008">' + label + '</span>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      overlaysRef.current.push(L.marker([point.lat, point.lon], { icon, keyboard: false }).addTo(map));
      bounds.push([point.lat, point.lon]);
    };

    addMarker(origin, "pickup");
    addMarker(destination, "dropoff");

    if (route?.coordinates?.length) {
      const routeLatLngs = route.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
      overlaysRef.current.push(L.polyline(routeLatLngs, {
        color: "#E5B84B",
        weight: 6,
        opacity: 0.96,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map));
      bounds.push(...routeLatLngs);
    }

    if (driverRoute?.coordinates?.length) {
      const approach = driverRoute.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
      overlaysRef.current.push(L.polyline(approach, {
        color: "#E5B84B",
        weight: 3,
        opacity: 0.55,
        dashArray: "8 9",
        lineCap: "round",
      }).addTo(map));
      bounds.push(...approach);
    }

    if (driver) {
      const driverIcon = L.divIcon({
        className: "marka-leaflet-driver-shell",
        html: '<span style="display:grid;place-items:center;width:30px;height:30px;border:3px solid #E5B84B;border-radius:50%;background:#171717;color:#E5B84B;font-size:15px;box-shadow:0 3px 12px #0009">▲</span>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      overlaysRef.current.push(L.marker([driver.lat, driver.lon], { icon: driverIcon, keyboard: false }).addTo(map));
      bounds.push([driver.lat, driver.lon]);
    }

    if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [48, 48], maxZoom: 16 });
    else if (bounds.length === 1) map.setView(bounds[0], 15);
  }, [ready, route, origin, destination, driverRoute, driver]);

  return <div ref={hostRef} className="absolute inset-0 bg-[#101318]" role="application" aria-label="Mapa alternativo de mobilidade MARKA" />;
}
