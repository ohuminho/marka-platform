"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import MobilityLiveMap from "@/frontend/features/mobility/components/MobilityLiveMap";
import MobilityServiceTabs from "@/frontend/features/mobility/components/MobilityServiceTabs";

type MapPoint = { lat: number; lon: number };
type MapTarget = "origin" | "destination";
type Props = { title: string; children: (mapPoint: MapPoint | null, requestMapPoint: (target: MapTarget) => void) => ReactNode };

export default function MobilityServiceFrame({ title, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [mapTarget, setMapTarget] = useState<MapTarget>("destination");
  const [selectingMapPoint, setSelectingMapPoint] = useState(false);
  const [mapPoint, setMapPoint] = useState<MapPoint | null>(null);

  const requestMapPoint = (target: MapTarget) => {
    setMapTarget(target);
    setMapPoint(null);
    setSelectingMapPoint(true);
    setExpanded(false);
  };

  const handleMapPoint = (point: MapPoint) => {
    if (!selectingMapPoint) return;
    setMapPoint(point);
    setSelectingMapPoint(false);
  };

  return (
    <main className="fixed inset-0 z-40 isolate h-[100dvh] w-full overflow-hidden bg-[#09090b] text-white">
      <div className="absolute inset-0 z-0 h-full w-full">
        <MobilityLiveMap showStatus={false} onMapDestinationSelect={handleMapPoint} />
      </div>
      {selectingMapPoint && <div className="pointer-events-none absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-full border border-[#c8a24a]/35 bg-[#0d0d0f]/85 px-4 py-2 text-[11px] font-medium text-[#e8c77c] shadow-lg backdrop-blur-xl">{mapTarget === "origin" ? "Toque no mapa para marcar a recolha" : "Toque no mapa para marcar o destino"}</div>}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] sm:px-6">
        <Link href="/app" aria-label="Menu principal" className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#0d0d0f]/75 text-lg text-white shadow-lg backdrop-blur-xl">☰</Link>
        <div className="rounded-full border border-white/10 bg-[#0d0d0f]/75 px-4 py-2 text-center backdrop-blur-xl">
          <p className="text-[10px] font-black tracking-[.2em]">MARKA <span className="text-[#c8a24a]">MOBILITY</span></p>
          <p className="mt-0.5 text-[8px] tracking-[.16em] text-white/45">ANGOLA</p>
        </div>
        <Link href="/app/account" aria-label="Abrir perfil" className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-[#c8a24a]/35 bg-[#0d0d0f]/75 text-sm font-semibold text-[#e8c77c] shadow-lg backdrop-blur-xl">◎</Link>
      </header>

      <section className={"absolute inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0d0d0f]/75 shadow-[0_-20px_70px_rgba(0,0,0,.28)] backdrop-blur-xl sm:bottom-4 sm:rounded-[28px] " + (expanded ? "max-h-[84dvh]" : "max-h-[46dvh] sm:max-h-[48dvh]")}>
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Recolher painel" : "Expandir painel"} aria-expanded={expanded} className="mx-auto flex h-7 w-16 shrink-0 items-center justify-center">
          <span className="h-1 w-10 rounded-full bg-white/35" />
        </button>
        <div className="shrink-0 px-4 pb-3 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            <span className="text-[9px] font-medium tracking-wide text-white/40">AOA · Kz</span>
          </div>
          <MobilityServiceTabs active="cargo" />
        </div>
        <div className="mobility-service-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-5">
          {children(mapPoint, requestMapPoint)}
          <p className="pb-2 pt-4 text-center text-[9px] text-white/35">Powered By Magestade Pura Digital</p>
        </div>
      </section>
    </main>
  );
}
