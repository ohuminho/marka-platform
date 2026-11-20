"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";
import MarkaVehicleIllustration from "./MarkaVehicleIllustration";

type ServiceType = "CARGO_SHIPMENT" | "WATER_DELIVERY" | "ROADSIDE_ASSISTANCE";
type Point = { latitude: number; longitude: number; address: string };
type PointField = { address: string; point: Point | null; searching: boolean };
type MapPoint = { lat: number; lon: number };
type MapTarget = "origin" | "destination";
type Props = { mapPoint?: MapPoint | null; onRequestMapPoint?: (target: MapTarget) => void };

const assistanceOptions = [
  ["TOW", "Reboque"],
  ["ACCIDENT_RECOVERY", "Recuperação após acidente"],
  ["BREAKDOWN_RECOVERY", "Avaria"],
  ["TIRE_ASSISTANCE", "Pneu"],
  ["BATTERY_ASSISTANCE", "Bateria"],
  ["ON_SITE_MECHANIC", "Mecânico no local"],
] as const;

async function locateAddress(address: string): Promise<Point> {
  const query = address.trim();
  if (query.length < 4) throw new Error("Escreva um endereço ou local mais completo.");
  const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", countrycodes: "ao", addressdetails: "1" });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Não foi possível localizar o endereço. Tente novamente.");
  const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
  const match = results[0];
  if (!match) throw new Error("Não encontrámos esse local. Experimente indicar bairro, rua ou município.");
  return { latitude: Number(match.lat), longitude: Number(match.lon), address: match.display_name };
}

export default function MobilityFreightRequestForm({ mapPoint = null, onRequestMapPoint }: Props) {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.id;
  const [service, setService] = useState<ServiceType>("CARGO_SHIPMENT");
  const [origin, setOrigin] = useState<PointField>({ address: "", point: null, searching: false });
  const [destination, setDestination] = useState<PointField>({ address: "", point: null, searching: false });
  const [cargoDescription, setCargoDescription] = useState("");
  const [vehiclePreference, setVehiclePreference] = useState("ANY");
  const [waterType, setWaterType] = useState<"POTABLE_WATER" | "NON_POTABLE_WATER">("POTABLE_WATER");
  const [quantity, setQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState<"KG" | "TON" | "LITRE" | "M3">("KG");
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [assistanceType, setAssistanceType] = useState<(typeof assistanceOptions)[number][0]>("TOW");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapTarget, setMapTarget] = useState<MapTarget>("destination");
  const [loadSize, setLoadSize] = useState<"MOTO_BOX" | "VAN" | "TRUCK">("MOTO_BOX");
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [includeHelper, setIncludeHelper] = useState(false);
  const [driverNote, setDriverNote] = useState("");

  useEffect(() => {
    if (!mapPoint) return;
    let current = true;
    const applyMapPoint = async () => {
      let address = `Ponto no mapa (${mapPoint.lat.toFixed(5)}, ${mapPoint.lon.toFixed(5)})`;
      try {
        const url = new URL("https://photon.komoot.io/reverse");
        url.searchParams.set("lat", String(mapPoint.lat));
        url.searchParams.set("lon", String(mapPoint.lon));
        url.searchParams.set("lang", "pt");
        const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as { features?: Array<{ properties?: Record<string, unknown> }> };
          const properties = data.features?.[0]?.properties ?? {};
          const parts = [properties.name, properties.street, properties.district, properties.city, properties.state]
            .filter((part): part is string => typeof part === "string" && part.length > 0)
            .filter((part, index, all) => all.indexOf(part) === index);
          if (parts.length) address = parts.join(", ");
        }
      } catch {
        // Coordinates remain valid even when reverse geocoding is unavailable.
      }
      if (!current) return;
      const point = { latitude: mapPoint.lat, longitude: mapPoint.lon, address };
      const nextField = { address, point, searching: false };
      if (mapTarget === "origin") setOrigin(nextField);
      else setDestination(nextField);
      setError(null);
    };
    void applyMapPoint();
    return () => { current = false; };
  }, [mapPoint, mapTarget]);

  const updatePoint = (setter: typeof setOrigin, field: PointField, address: string) => {
    setter({ ...field, address, point: null });
  };

  const findPoint = async (field: PointField, setter: typeof setOrigin) => {
    setter({ ...field, searching: true });
    setError(null);
    try {
      const point = await locateAddress(field.address);
      setter({ address: point.address, point, searching: false });
    } catch (cause) {
      setter({ ...field, searching: false });
      setError(cause instanceof Error ? cause.message : "Não foi possível localizar o endereço.");
    }
  };

  const requestGpsLocation = (setter: typeof setOrigin, current: PointField) => {
    if (!navigator.geolocation) {
      setError("Este dispositivo não disponibiliza localização GPS.");
      return;
    }
    setError(null);
    setter({ ...current, searching: true });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: current.address.trim() || "Localização GPS atual",
        };
        setter({ address: point.address, point, searching: false });
      },
      () => {
        setter({ ...current, searching: false });
        setError("Não foi possível obter a localização. Verifique a permissão de GPS ou procure o endereço.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const pointInput = (label: string, field: PointField, setter: typeof setOrigin, required = true, target: MapTarget = "destination") => (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-2">
      <span aria-hidden="true" className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl " + (target === "origin" ? "bg-emerald-400/10 text-emerald-300" : "bg-[#c8a24a]/10 text-[#e8c77c]")}>{target === "origin" ? "●" : "◆"}</span>
      <div className="min-w-0 flex-1">
        <label className="block text-[8px] font-bold uppercase tracking-[.16em] text-white/40">{label}{!required ? " · opcional" : ""}</label>
        <input value={field.address} onChange={(event) => updatePoint(setter, field, event.target.value)} placeholder="Bairro, rua ou local" className="h-7 w-full min-w-0 border-0 bg-transparent p-0 text-[12px] text-white outline-none placeholder:text-white/35 focus:ring-0" />
        {field.point && <span className="text-[9px] text-emerald-300">Local confirmado</span>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" disabled={field.searching || !field.address.trim()} onClick={() => void findPoint(field, setter)} aria-label={"Localizar " + label} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-[11px] text-white/65 disabled:opacity-35">{field.searching ? "…" : "⌕"}</button>
        <button type="button" disabled={field.searching} onClick={() => requestGpsLocation(setter, field)} aria-label={"Usar GPS para " + label} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-[10px] text-[#e8c77c] disabled:opacity-35">GPS</button>
        {onRequestMapPoint && <button type="button" onClick={() => { setMapTarget(target); onRequestMapPoint(target); }} aria-label={"Escolher " + label + " no mapa"} className="grid h-9 w-9 place-items-center rounded-xl border border-[#c8a24a]/35 bg-[#c8a24a]/10 text-[11px] text-[#e8c77c]">⌖</button>}
      </div>
    </div>
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!organizationId) {
      setError("Seleccione primeiro a sua organização.");
      return;
    }
    if (service === "CARGO_SHIPMENT" && (!origin.point || !destination.point || !cargoDescription.trim() || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0)) {
      setError("Confirme a recolha, o destino, descreva a carga e indique uma quantidade válida.");
      return;
    }
    if (service === "CARGO_SHIPMENT") {
      const weightKg = quantityUnit === "TON" ? Number(quantity) * 1000 : quantityUnit === "KG" ? Number(quantity) : NaN;
      if (!Number.isFinite(weightKg) || weightKg <= 0 || (loadSize === "MOTO_BOX" && weightKg > 15) || (loadSize === "VAN" && (weightKg <= 15 || weightKg > 500)) || (loadSize === "TRUCK" && weightKg <= 500)) {
        setError("O peso não corresponde ao porte. Moto Box: até 15 kg; Carrinha: acima de 15 até 500 kg; Camião: acima de 500 kg.");
        return;
      }
    }
    if (recipientPhone.trim() && !/^\\+?\\d[\\d\\s()-]{7,17}$/.test(recipientPhone.trim())) {
      setError("Confirme o número de telefone do destinatário.");
      return;
    }
    if (service === "WATER_DELIVERY" && (!destination.point || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0)) {
      setError("Confirme o endereço e a quantidade de água.");
      return;
    }
    if (service === "ROADSIDE_ASSISTANCE" && (!origin.point || !vehicleDescription.trim())) {
      setError("Confirme a localização e descreva o veículo.");
      return;
    }

    setSubmitting(true);
    try {
      const requestFingerprint = JSON.stringify({
        service, origin: origin.point, destination: destination.point,
        cargoDescription: cargoDescription.trim(), vehiclePreference, waterType, quantity: Number(quantity),
        quantityUnit, vehicleDescription: vehicleDescription.trim(), assistanceType,
        notes: notes.trim(), loadSize, recipientName: recipientName.trim(), recipientPhone: recipientPhone.trim(), includeHelper, driverNote: driverNote.trim(),
      });
      const storageKey = "marka:freight:pending:" + organizationId;
      let idempotencyKey: string;
      try {
        const pendingRaw = window.sessionStorage.getItem(storageKey);
        const pending = pendingRaw ? JSON.parse(pendingRaw) as { key?: string; fingerprint?: string } : null;
        idempotencyKey = pending?.fingerprint === requestFingerprint && typeof pending.key === "string"
          ? pending.key
          : globalThis.crypto.randomUUID();
        window.sessionStorage.setItem(storageKey, JSON.stringify({ key: idempotencyKey, fingerprint: requestFingerprint }));
      } catch {
        idempotencyKey = globalThis.crypto.randomUUID();
      }
      const details: Record<string, unknown> = { notes: notes.trim() || undefined };
      if (service === "CARGO_SHIPMENT") {
        details.cargoItems = [{ description: cargoDescription.trim(), quantity: Number(quantity), unit: quantityUnit, category: "GENERAL" }];
        details.loadSize = loadSize;
        details.vehiclePreference = loadSize === "MOTO_BOX" ? "CARGO_TRICYCLE" : loadSize === "VAN" ? "CARGO_VAN" : "HEAVY_TRUCK";
        details.recipient = { name: recipientName.trim() || undefined, phone: recipientPhone.trim() || undefined, includeHelper, driverNote: driverNote.trim() || undefined };
      } else if (service === "WATER_DELIVERY") {
        details.waterType = waterType;
      } else {
        details.vehicleDescription = vehicleDescription.trim();
        details.assistanceType = assistanceType;
      }
      const payload = {
        requestType: service,
        idempotencyKey,
        origin: origin.point ?? undefined,
        destination: destination.point ?? undefined,
        quantity: service === "WATER_DELIVERY" || service === "CARGO_SHIPMENT" ? Number(quantity) : undefined,
        quantityUnit: service === "WATER_DELIVERY" || service === "CARGO_SHIPMENT" ? quantityUnit : undefined,
        currency: "AOA",
        details,
      };
      const response = await fetch("/api/freight/requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId, "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível registar o pedido.");
      setMessage(`Pedido ${data.request.reference} registado. Guarde esta referência para acompanhamento.`);
      try {
        const pendingRaw = window.sessionStorage.getItem(storageKey);
        const pending = pendingRaw ? JSON.parse(pendingRaw) as { key?: string } : null;
        if (pending?.key === idempotencyKey) window.sessionStorage.removeItem(storageKey);
      } catch {
        // O registo do servidor é a fonte de verdade.
      }
      setCargoDescription("");
      setQuantity("");
      setVehicleDescription("");
      setNotes("");
      setOrigin({ address: "", point: null, searching: false });
      setDestination({ address: "", point: null, searching: false });
      window.dispatchEvent(new Event("marka:freight-request-created"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "O pedido não foi concluído. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const recipientSummary = recipientName.trim()
    ? recipientName.trim() + (recipientPhone.trim() ? " · +244 " + recipientPhone.trim() : "") + (includeHelper ? " · Com ajudante" : "")
    : "Nome e telefone · Ajudante opcional";

  return (
    <section className="mobility-freight-form relative text-white">
      <form onSubmit={submit} className="space-y-3">
        {service === "CARGO_SHIPMENT" && <>
          {pointInput("Recolha", origin, setOrigin, true, "origin")}
          {pointInput("Entrega", destination, setDestination, true, "destination")}
          <fieldset>
            <legend className="sr-only">Porte da carga</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { id: "MOTO_BOX", icon: "▣", title: "Moto Box", weight: "até 15 kg" },
                { id: "VAN", icon: "▰", title: "Carrinha", weight: "até 500 kg" },
                { id: "TRUCK", icon: "▤", title: "Camião", weight: "+500 kg" },
              ] as const).map((item) => <button key={item.id} type="button" aria-pressed={loadSize === item.id} onClick={() => { setLoadSize(item.id); setVehiclePreference(item.id === "MOTO_BOX" ? "CARGO_TRICYCLE" : item.id === "VAN" ? "CARGO_VAN" : "HEAVY_TRUCK"); setError(null); }} className={"flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-1.5 transition-colors " + (loadSize === item.id ? "border-[#c8a24a]/55 bg-[#c8a24a]/12 text-[#f0d28b]" : "border-white/10 bg-white/[.035] text-white/65 hover:bg-white/[.07]")}>
                <span aria-hidden="true" className="text-base">{item.icon}</span><span className="min-w-0 text-left leading-tight"><span className="block truncate text-[10px] font-bold">{item.title}</span><span className="mt-0.5 block whitespace-nowrap text-[8px] text-white/45">{item.weight}</span></span>
              </button>)}
            </div>
          </fieldset>
          <div className="grid grid-cols-[1fr_104px] gap-2">
            <label className="min-w-0 rounded-xl border border-white/10 bg-black/25 px-3 py-2"><span className="block text-[8px] font-bold uppercase tracking-[.14em] text-white/40">O que vai transportar?</span><input value={cargoDescription} onChange={(event) => setCargoDescription(event.target.value)} placeholder="Ex.: caixas, móveis…" className="h-7 w-full bg-transparent text-[11px] text-white outline-none placeholder:text-white/35" /></label>
            <label className="rounded-xl border border-white/10 bg-black/25 px-3 py-2"><span className="block text-[8px] font-bold uppercase tracking-[.14em] text-white/40">Peso · kg</span><input type="number" min="0.1" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0" className="h-7 w-full bg-transparent text-[11px] text-white outline-none placeholder:text-white/35" /></label>
          </div>
          <button type="button" onClick={() => setRecipientOpen(true)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 text-left transition hover:bg-white/[.06]">
            <span className="min-w-0"><span className="block text-[10px] font-semibold text-white/85">Dados do destinatário</span><span className="block truncate text-[9px] text-white/45">{recipientSummary}</span></span><span aria-hidden="true" className="shrink-0 text-sm text-[#c8a24a]">＋</span>
          </button>
        </>}

        {service === "WATER_DELIVERY" && <>
          {pointInput("Entrega", destination, setDestination, true, "destination")}
          <div className="grid grid-cols-2 gap-2">
            <label className="rounded-xl border border-white/10 bg-black/25 px-3 py-2"><span className="block text-[8px] uppercase tracking-wider text-white/45">Quantidade</span><input type="number" min="1" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Litros / m³" className="h-7 w-full bg-transparent text-xs text-white outline-none" /></label>
            <label className="rounded-xl border border-white/10 bg-black/25 px-3 py-2"><span className="block text-[8px] uppercase tracking-wider text-white/45">Unidade</span><select value={quantityUnit} onChange={(event) => setQuantityUnit(event.target.value as typeof quantityUnit)} className="h-7 w-full bg-transparent text-xs text-white outline-none"><option className="bg-zinc-900" value="LITRE">Litros</option><option className="bg-zinc-900" value="M3">m³</option></select></label>
          </div>
          <label className="block rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[10px] text-white/70">Tipo de água<select value={waterType} onChange={(event) => setWaterType(event.target.value as typeof waterType)} className="mt-1 h-8 w-full bg-transparent text-xs text-white"><option className="bg-zinc-900" value="POTABLE_WATER">Potável</option><option className="bg-zinc-900" value="NON_POTABLE_WATER">Não potável</option></select></label>
        </>}

        {service === "ROADSIDE_ASSISTANCE" && <>
          {pointInput("Localização do veículo", origin, setOrigin, true, "origin")}
          <label className="block rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[10px] text-white/70">Assistência<select value={assistanceType} onChange={(event) => setAssistanceType(event.target.value as typeof assistanceType)} className="mt-1 h-8 w-full bg-transparent text-xs text-white">{assistanceOptions.map(([value, label]) => <option className="bg-zinc-900" key={value} value={value}>{label}</option>)}</select></label>
          <input value={vehicleDescription} onChange={(event) => setVehicleDescription(event.target.value)} placeholder="Marca e modelo do veículo" className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-xs text-white outline-none placeholder:text-white/35" />
        </>}

        {service !== "CARGO_SHIPMENT" && <label className="block rounded-xl border border-white/10 bg-black/25 px-3 py-2"><span className="block text-[8px] uppercase tracking-wider text-white/45">Observações (opcional)</span><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Informação adicional" className="h-8 w-full bg-transparent text-xs text-white outline-none placeholder:text-white/35" /></label>}
        {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[10px] text-rose-200">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] px-3 py-2 text-[10px] text-emerald-200">{message}</p>}

        <div className="sticky bottom-0 -mx-3 flex items-center justify-between gap-3 border-t border-white/10 bg-[#0d0d0f]/95 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="min-w-0"><span className="block text-[8px] font-bold uppercase tracking-[.14em] text-white/40">Preço estimado</span><strong className="block truncate text-sm text-[#e8c77c]">Sob cotação · AOA</strong></div>
          <button type="submit" disabled={submitting} className="min-h-11 shrink-0 rounded-xl border border-[#c8a24a]/50 bg-[#c8a24a] px-5 text-[11px] font-extrabold text-[#09090b] shadow-lg shadow-[#c8a24a]/10 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-50">{submitting ? "A enviar…" : service === "CARGO_SHIPMENT" ? "Pedir Entrega" : service === "WATER_DELIVERY" ? "Pedir Água" : "Pedir Assistência"}</button>
        </div>
      </form>

      {recipientOpen && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRecipientOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="recipient-title" className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101014]/95 p-4 shadow-2xl backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between"><div><h2 id="recipient-title" className="text-sm font-bold text-white">Dados do destinatário</h2><p className="mt-1 text-[10px] text-white/45">Opcional · Para facilitar a entrega</p></div><button type="button" onClick={() => setRecipientOpen(false)} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-full bg-white/[.07] text-white/70">×</button></div>
          <div className="space-y-3">
            <label className="block"><span className="mb-1 block text-[9px] font-semibold text-white/55">Nome do destinatário</span><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Nome completo" className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white outline-none focus:border-[#c8a24a]/60" /></label>
            <label className="block"><span className="mb-1 block text-[9px] font-semibold text-white/55">Telemóvel do destinatário</span><div className="flex h-11 items-center rounded-xl border border-white/10 bg-black/30 px-3 focus-within:border-[#c8a24a]/60"><span className="mr-2 text-xs text-white/50">+244</span><input value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value.replace(/[^0-9\s()-]/g, "").slice(0, 16))} placeholder="923 000 000" inputMode="tel" className="h-full min-w-0 flex-1 bg-transparent text-xs text-white outline-none" /></div></label>
            <label className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 bg-white/[.035] px-3"><span className="text-xs text-white/80">Incluir ajudante de carga</span><input type="checkbox" checked={includeHelper} onChange={(event) => setIncludeHelper(event.target.checked)} className="h-4 w-4 accent-[#c8a24a]" /></label>
            <label className="block"><span className="mb-1 block text-[9px] font-semibold text-white/55">Nota rápida para o motorista</span><input value={driverNote} onChange={(event) => setDriverNote(event.target.value)} placeholder="Portão azul, ligar ao chegar" className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white outline-none focus:border-[#c8a24a]/60" /></label>
          </div>
          <button type="button" onClick={() => setRecipientOpen(false)} className="mt-4 min-h-11 w-full rounded-xl bg-[#c8a24a] text-xs font-extrabold text-[#09090b]">Guardar dados</button>
        </section>
      </div>}
    </section>
  );
}
