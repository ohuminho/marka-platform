"use client";

import { useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

type ServiceType = "CARGO_SHIPMENT" | "WATER_DELIVERY" | "ROADSIDE_ASSISTANCE";
type Point = { latitude: number; longitude: number; address: string };
type PointField = { address: string; point: Point | null; searching: boolean };

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

export default function MobilityFreightRequestForm() {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.id;
  const [service, setService] = useState<ServiceType>("CARGO_SHIPMENT");
  const [origin, setOrigin] = useState<PointField>({ address: "", point: null, searching: false });
  const [destination, setDestination] = useState<PointField>({ address: "", point: null, searching: false });
  const [cargoDescription, setCargoDescription] = useState("");
  const [waterType, setWaterType] = useState<"POTABLE_WATER" | "NON_POTABLE_WATER">("POTABLE_WATER");
  const [quantity, setQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState<"LITRE" | "M3">("LITRE");
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [assistanceType, setAssistanceType] = useState<(typeof assistanceOptions)[number][0]>("TOW");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const useGps = (setter: typeof setOrigin, current: PointField) => {
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

  const pointInput = (label: string, field: PointField, setter: typeof setOrigin, required = true) => (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-[var(--theme-text)]">{label}{!required && <span className="ml-1 text-[var(--theme-text-faint)]">(opcional)</span>}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={field.address} onChange={(event) => updatePoint(setter, field, event.target.value)} placeholder="Bairro, rua ou município" className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-text-muted)]" />
        <button type="button" disabled={field.searching || !field.address.trim()} onClick={() => void findPoint(field, setter)} className="min-h-11 rounded-xl border border-[var(--theme-border)] px-4 text-xs font-medium text-[var(--theme-text)] disabled:opacity-40">{field.searching ? "A localizar…" : "Localizar"}</button>
        <button type="button" disabled={field.searching} onClick={() => useGps(setter, field)} className="min-h-11 rounded-xl border border-[var(--theme-border)] px-4 text-xs font-medium text-[var(--theme-text-muted)] disabled:opacity-40">Usar GPS</button>
      </div>
      {field.point && <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Local confirmado</p>}
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
    if (service === "CARGO_SHIPMENT" && (!origin.point || !destination.point || !cargoDescription.trim())) {
      setError("Confirme a recolha, o destino e descreva a carga.");
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
        cargoDescription: cargoDescription.trim(), waterType, quantity: Number(quantity),
        quantityUnit, vehicleDescription: vehicleDescription.trim(), assistanceType,
        notes: notes.trim(),
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
        details.cargoItems = [{ description: cargoDescription.trim(), quantity: 1, category: "GENERAL" }];
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
        quantity: service === "WATER_DELIVERY" ? Number(quantity) : undefined,
        quantityUnit: service === "WATER_DELIVERY" ? quantityUnit : undefined,
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
      setMessage(`Pedido ${data.request.reference} recebido. Acompanhe a cotação nesta página.`);
      try {
        const pendingRaw = window.sessionStorage.getItem(storageKey);
        const pending = pendingRaw ? JSON.parse(pendingRaw) as { key?: string } : null;
        if (pending?.key === idempotencyKey) window.sessionStorage.removeItem(storageKey);
      } catch {
        // O registo do servidor é a fonte de verdade.
      }
      setCargoDescription("");
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

  return (
    <section className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <div className="max-w-xl">
        <p className="text-[9px] font-semibold uppercase tracking-[.22em] text-[var(--theme-text-faint)]">Outros serviços</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--theme-text)]">O que precisa de transportar?</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--theme-text-muted)]">Escolha um serviço e indique apenas os dados necessários. A MARKA procura uma proposta para si.</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Tipo de serviço">
        {([
          ["CARGO_SHIPMENT", "Transportar carga", "Mercadorias e materiais"],
          ["WATER_DELIVERY", "Pedir água", "Por litros ou m³"],
          ["ROADSIDE_ASSISTANCE", "Assistência", "Avaria, pneu ou reboque"],
        ] as const).map(([value, title, subtitle]) => (
          <button key={value} type="button" aria-pressed={service === value} onClick={() => { setService(value); setError(null); setMessage(null); }} className={`min-h-[76px] rounded-2xl border px-4 py-3 text-left transition ${service === value ? "border-[var(--theme-text-muted)] bg-[var(--theme-background)]" : "border-[var(--theme-border)] hover:bg-[var(--theme-background)]"}`}>
            <span className="block text-sm font-semibold text-[var(--theme-text)]">{title}</span>
            <span className="mt-1 block text-[11px] text-[var(--theme-text-muted)]">{subtitle}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-5">
        {service === "CARGO_SHIPMENT" && <>
          {pointInput("Local de recolha", origin, setOrigin)}
          {pointInput("Destino", destination, setDestination)}
          <label className="block space-y-2"><span className="text-xs font-medium text-[var(--theme-text)]">O que pretende transportar?</span><input value={cargoDescription} onChange={(event) => setCargoDescription(event.target.value)} placeholder="Ex.: 20 sacos de cimento, mobiliário…" className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-text-muted)]" /></label>
        </>}
        {service === "WATER_DELIVERY" && <>
          {pointInput("Endereço de entrega", destination, setDestination)}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-2"><span className="block text-xs font-medium text-[var(--theme-text)]">Quantidade</span><input type="number" min="1" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Indique a quantidade" className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)]" /></label>
            <label className="space-y-2"><span className="block text-xs font-medium text-[var(--theme-text)]">Unidade</span><select value={quantityUnit} onChange={(event) => setQuantityUnit(event.target.value as typeof quantityUnit)} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)]"><option value="LITRE">Litros</option><option value="M3">Metros cúbicos (m³)</option></select></label>
          </div>
          <label className="block space-y-2"><span className="text-xs font-medium text-[var(--theme-text)]">Tipo de água</span><select value={waterType} onChange={(event) => setWaterType(event.target.value as typeof waterType)} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)]"><option value="POTABLE_WATER">Potável</option><option value="NON_POTABLE_WATER">Não potável</option></select></label>
        </>}
        {service === "ROADSIDE_ASSISTANCE" && <>
          {pointInput("Onde está o veículo?", origin, setOrigin)}
          <label className="block space-y-2"><span className="text-xs font-medium text-[var(--theme-text)]">Tipo de assistência</span><select value={assistanceType} onChange={(event) => setAssistanceType(event.target.value as typeof assistanceType)} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)]">{assistanceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block space-y-2"><span className="text-xs font-medium text-[var(--theme-text)]">Que veículo é?</span><input value={vehicleDescription} onChange={(event) => setVehicleDescription(event.target.value)} placeholder="Ex.: Toyota Hiace, matrícula…" className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)]" /></label>
        </>}
        <label className="block space-y-2"><span className="text-xs font-medium text-[var(--theme-text)]">Observações <span className="text-[var(--theme-text-faint)]">(opcional)</span></span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Alguma informação adicional?" className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-text-muted)]" /></label>
        {error && <p role="alert" className="rounded-xl border border-red-500/20 px-4 py-3 text-xs text-red-600">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-500/20 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">{message}</p>}
        <div className="flex flex-col gap-3 border-t border-[var(--theme-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-5 text-[var(--theme-text-muted)]">Pedir uma proposta não implica pagamento nem despacho.</p>
          <button type="submit" disabled={submitting} className="min-h-12 rounded-xl bg-[var(--theme-text)] px-6 text-xs font-semibold text-[var(--theme-background)] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-50">{submitting ? "A enviar pedido…" : "Pedir cotação"}</button>
        </div>
      </form>
    </section>
  );
}
