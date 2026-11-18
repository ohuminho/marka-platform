"use client";

import { useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";
import MarkaVehicleIllustration from "./MarkaVehicleIllustration";

type ServiceType = "CARGO_SHIPMENT" | "WATER_DELIVERY" | "ROADSIDE_ASSISTANCE";
type Point = { latitude: number; longitude: number; address: string };
type PointCandidate = Point & { label: string };
type PointField = { address: string; point: Point | null; searching: boolean; candidates: PointCandidate[] };

const assistanceOptions = [
  ["TOW", "Reboque"],
  ["ACCIDENT_RECOVERY", "Recuperação após acidente"],
  ["BREAKDOWN_RECOVERY", "Avaria"],
  ["TIRE_ASSISTANCE", "Pneu"],
  ["BATTERY_ASSISTANCE", "Bateria"],
  ["ON_SITE_MECHANIC", "Mecânico no local"],
] as const;

async function locateAddress(address: string): Promise<PointCandidate[]> {
  const query = address.trim();
  if (query.length < 3) throw new Error("Escreva pelo menos 3 caracteres: bairro, rua ou município.");
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "pt");
  url.searchParams.set("lat", "-8.83");
  url.searchParams.set("lon", "13.23");
  url.searchParams.set("zoom", "7");
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error("A pesquisa de locais está temporariamente indisponível. Tente usar o GPS ou novamente dentro de instantes.");
  const data = await response.json() as {
    features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> }>;
  };
  const candidates = (data.features ?? []).flatMap((feature): PointCandidate[] => {
    const properties = feature.properties ?? {};
    const country = properties.country;
    if (typeof country !== "string" || !/angola/i.test(country)) return [];
    const coordinates = feature.geometry?.coordinates;
    if (!coordinates || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return [];
    const parts = [properties.name, properties.street, properties.district, properties.city, properties.state, properties.country]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .filter((part, index, all) => all.indexOf(part) === index);
    const label = parts.join(", ");
    if (!label) return [];
    return [{ latitude: coordinates[1], longitude: coordinates[0], address: label, label }];
  });
  const unique = candidates.filter((candidate, index, all) =>
    all.findIndex((item) => item.latitude === candidate.latitude && item.longitude === candidate.longitude) === index
  );
  if (!unique.length) throw new Error("Não encontrámos resultados confirmados em Angola. Experimente indicar bairro, rua ou município, ou use o GPS.");
  return unique.slice(0, 6);
}

export default function MobilityFreightRequestForm() {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.id;
  const [service, setService] = useState<ServiceType>("CARGO_SHIPMENT");
  const [origin, setOrigin] = useState<PointField>({ address: "", point: null, searching: false, candidates: [] });
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

  const locationSearching = service === "CARGO_SHIPMENT"
    ? origin.searching || destination.searching
    : service === "WATER_DELIVERY"
      ? destination.searching
      : origin.searching;

  const updatePoint = (setter: typeof setOrigin, _field: PointField, address: string) => {
    setter((previous) => ({ ...previous, address, point: null, searching: false, candidates: [] }));
  };

  const findPoint = async (field: PointField, setter: typeof setOrigin) => {
    const query = field.address.trim();
    setter((previous) => ({ ...previous, searching: true, candidates: [], point: null }));
    setError(null);
    try {
      const candidates = await locateAddress(query);
      setter((previous) => previous.address.trim() === query
        ? { ...previous, point: null, candidates, searching: false }
        : { ...previous, searching: false });
    } catch (cause) {
      setter((previous) => ({ ...previous, searching: false }));
      setError(cause instanceof Error ? cause.message : "Não foi possível localizar o endereço.");
    }
  };

  const requestGpsLocation = (setter: typeof setOrigin, current: PointField) => {
    if (!navigator.geolocation) {
      setError("Este dispositivo não disponibiliza localização GPS.");
      return;
    }
    const addressAtRequest = current.address;
    setError(null);
    setter((previous) => ({ ...previous, searching: true }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setter((previous) => {
          if (previous.address !== addressAtRequest) return { ...previous, searching: false };
          const point = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: previous.address.trim() || "Localização GPS atual",
          };
          return { address: point.address, point, searching: false, candidates: [] };
        });
      },
      () => {
        setter((previous) => ({ ...previous, searching: false }));
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
        <button type="button" disabled={field.searching} onClick={() => requestGpsLocation(setter, field)} className="min-h-11 rounded-xl border border-[var(--theme-border)] px-4 text-xs font-medium text-[var(--theme-text-muted)] disabled:opacity-40">Usar GPS</button>
      </div>
      {field.candidates.length > 0 && !field.point && (
        <div className="space-y-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-2" role="group" aria-label={`Escolher localização para ${label}`}>
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">Escolha o local correcto</p>
          {field.candidates.map((candidate, index) => (
            <button key={`${candidate.latitude}:${candidate.longitude}:${index}`} type="button"
              onClick={() => setter((previous) => previous.address === field.address
                ? { address: candidate.address, point: candidate, searching: false, candidates: [] }
                : previous)}
              className="min-h-10 w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--theme-text)] hover:bg-[var(--theme-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-text-muted)]">
              {candidate.label}
            </button>
          ))}
        </div>
      )}
      {field.point && <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Local confirmado: {field.point.address}</p>}
    </div>
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (locationSearching) {
      setError("Aguarde a confirmação da localização antes de enviar o pedido.");
      return;
    }
    if (!organizationId) {
      setError("Seleccione primeiro a sua organização.");
      return;
    }
    if (service === "CARGO_SHIPMENT" && (!origin.point || !destination.point || !cargoDescription.trim() || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0)) {
      setError("Confirme a recolha, o destino, descreva a carga e indique uma quantidade válida.");
      return;
    }
    if (service === "CARGO_SHIPMENT" && origin.point && destination.point && origin.point.latitude === destination.point.latitude && origin.point.longitude === destination.point.longitude) {
      setError("A recolha e o destino não podem ser o mesmo local.");
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
        details.cargoItems = [{ description: cargoDescription.trim(), quantity: Number(quantity), unit: quantityUnit, category: "GENERAL" }];
        if (vehiclePreference !== "ANY") details.vehiclePreference = vehiclePreference;
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
      const requestId = globalThis.crypto.randomUUID();
      const response = await fetch("/api/freight/requests", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId, "Idempotency-Key": idempotencyKey, "X-Request-Id": requestId },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({})) as { request?: { reference?: string }; message?: string; code?: string; diagnosticId?: string };
      if (!response.ok || !data.request?.reference) {
        const friendly = data.code === "ORGANIZATION_ID_REQUIRED" || data.code === "ORGANIZATION_ACCESS_DENIED"
          ? "A sua organização não está seleccionada ou já não tem acesso. Escolha uma organização activa e tente novamente."
          : data.code === "AUTHENTICATION_REQUIRED" || data.code === "INVALID_SESSION"
            ? "A sua sessão expirou. Entre novamente na MARKA e repita o pedido."
            : data.code === "IDEMPOTENCY_CONFLICT"
              ? "Este pedido já foi enviado com outros dados. Actualize a página e confirme o histórico antes de tentar novamente."
              : data.message || "Não foi possível registar o pedido. Verifique a ligação e tente novamente.";
        const diagnosticId = data.diagnosticId || response.headers.get("X-Request-Id") || requestId;
        throw new Error(`${friendly} Referência técnica: ${diagnosticId}.`);
      }
      setMessage(`Pedido ${data.request.reference} registado. Acompanhe o estado na secção “Os seus pedidos”.`);
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
      setOrigin({ address: "", point: null, searching: false, candidates: [] });
      setDestination({ address: "", point: null, searching: false, candidates: [] });
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
        <p className="text-[9px] font-semibold uppercase tracking-[.22em] text-[var(--theme-text-faint)]">MARKA Mobility · Serviços</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--theme-text)]">{service === "CARGO_SHIPMENT" ? "Transporte de carga" : service === "WATER_DELIVERY" ? "Entrega de água" : "Assistência na estrada"}</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--theme-text-muted)]">{service === "CARGO_SHIPMENT" ? "Indique o que vai transportar, os locais e a viatura adequada. Receberá uma proposta antes de confirmar." : service === "WATER_DELIVERY" ? "Escolha o tipo e a quantidade de água e indique o local exacto de entrega." : "Diga-nos onde está, qual é o veículo e que tipo de ajuda precisa. A equipa procura um prestador adequado."}</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Tipo de serviço">
        {([
          ["CARGO_SHIPMENT", "Transportar carga", "Mercadorias e materiais"],
          ["WATER_DELIVERY", "Pedir água", "Por litros ou m³"],
          ["ROADSIDE_ASSISTANCE", "Assistência", "Avaria, pneu ou reboque"],
        ] as const).map(([value, title, subtitle]) => (
          <button key={value} type="button" aria-pressed={service === value} onClick={() => { setService(value); setQuantity(""); if (value === "WATER_DELIVERY") setQuantityUnit("LITRE"); else if (value === "CARGO_SHIPMENT") setQuantityUnit("KG"); setError(null); setMessage(null); }} className={`min-h-[76px] rounded-2xl border px-4 py-3 text-left transition ${service === value ? "border-[var(--theme-text-muted)] bg-[var(--theme-background)]" : "border-[var(--theme-border)] hover:bg-[var(--theme-background)]"}`}>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-2"><span className="block text-xs font-medium text-[var(--theme-text)]">Quantidade da carga</span><input type="number" min="0.01" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Indique a quantidade" className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)]" /></label>
            <label className="space-y-2"><span className="block text-xs font-medium text-[var(--theme-text)]">Unidade</span><select value={quantityUnit} onChange={(event) => setQuantityUnit(event.target.value as typeof quantityUnit)} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)]"><option value="KG">Quilogramas (kg)</option><option value="TON">Toneladas (t)</option><option value="M3">Metros cúbicos (m³)</option><option value="LITRE">Litros</option></select></label>
          </div>
          <fieldset className="space-y-3"><legend className="text-xs font-medium text-[var(--theme-text)]">Tipo de viatura preferida</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{([{value:"ANY",label:"Qualquer adequada",hint:"Mais opções",illustration:null},{value:"CARGO_TRICYCLE",label:"Carrinho tipo MyLads",hint:"Carga ligeira",illustration:"CARGO_TRICYCLE"},{value:"PICKUP",label:"Pick-up aberta",hint:"Caixa aberta",illustration:"PICKUP"},{value:"LIGHT_TRUCK",label:"Canter / Dyna",hint:"Caixa aberta",illustration:"LIGHT_TRUCK"},{value:"FLATBED_TRUCK",label:"Plataforma aberta",hint:"Carga volumosa",illustration:"FLATBED_TRUCK"},{value:"CARGO_VAN",label:"Carrinha fechada",hint:"Carga protegida",illustration:"CARGO_VAN"},{value:"TIPPER_TRUCK",label:"Basculante",hint:"Areia e inertes",illustration:"TIPPER_TRUCK"},{value:"HEAVY_TRUCK",label:"Camião pesado",hint:"Grande volume",illustration:"HEAVY_TRUCK"}] as const).map((option)=><button key={option.value} type="button" aria-pressed={vehiclePreference===option.value} onClick={()=>setVehiclePreference(option.value)} className={`min-w-0 rounded-xl border p-2 text-left transition ${vehiclePreference===option.value?"border-[var(--theme-text-muted)] bg-[var(--theme-background)] ring-1 ring-[var(--theme-text-muted)]":"border-[var(--theme-border)] hover:bg-[var(--theme-background)]"}`}>{option.illustration?<MarkaVehicleIllustration kind={option.illustration} className="h-14 w-full"/>:<div className="flex h-14 items-center justify-center text-[11px] font-semibold text-[var(--theme-text-muted)]">MARKA Mobility</div>}<span className="mt-1 block text-[11px] font-semibold text-[var(--theme-text)]">{option.label}</span><span className="block text-[10px] text-[var(--theme-text-muted)]">{option.hint}</span></button>)}</div><p className="text-[11px] leading-5 text-[var(--theme-text-muted)]">Caixa aberta e carrinha fechada são opções distintas. A preferência será usada para encontrar um prestador com a viatura correspondente.</p></fieldset>
        </>}
        {service === "WATER_DELIVERY" && <>
          {pointInput("Endereço de entrega", destination, setDestination)}
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-2"><span className="block text-xs font-medium text-[var(--theme-text)]">Quantidade de água</span><input type="number" min="1" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={quantityUnit === "LITRE" ? "Ex.: 5 000" : "Ex.: 5"} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)]" /></label>
              <label className="space-y-2"><span className="block text-xs font-medium text-[var(--theme-text)]">Unidade</span><select value={quantityUnit} onChange={(event) => setQuantityUnit(event.target.value as typeof quantityUnit)} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)]"><option value="LITRE">Litros</option><option value="M3">Metros cúbicos (m³)</option></select></label>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Quantidades frequentes">
              {(quantityUnit === "LITRE" ? ["1000", "5000", "10000", "20000"] : ["1", "5", "10", "20"]).map((value) => (
                <button key={value} type="button" onClick={() => setQuantity(value)} aria-pressed={quantity === value} className={`min-h-9 rounded-full border px-3 text-[11px] font-medium transition ${quantity === value ? "border-[var(--theme-text-muted)] bg-[var(--theme-background)] text-[var(--theme-text)]" : "border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-background)]"}`}>
                  {Number(value).toLocaleString("pt-PT")} {quantityUnit === "LITRE" ? "L" : "m³"}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-5 text-[var(--theme-text-muted)]">A quantidade é usada para identificar uma cisterna com capacidade adequada. O preço será apresentado na cotação.</p>
          </div>
          <label className="block space-y-2"><span className="text-xs font-medium text-[var(--theme-text)]">Tipo de água</span><select value={waterType} onChange={(event) => setWaterType(event.target.value as typeof waterType)} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)]"><option value="POTABLE_WATER">Potável</option><option value="NON_POTABLE_WATER">Não potável</option></select></label>
        </>}
        {service === "ROADSIDE_ASSISTANCE" && <>
          {pointInput("Onde está o veículo?", origin, setOrigin)}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium text-[var(--theme-text)]">Que ajuda precisa?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {assistanceOptions.map(([value, label]) => (
                <button key={value} type="button" aria-pressed={assistanceType === value} onClick={() => setAssistanceType(value)} className={`min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${assistanceType === value ? "border-[var(--theme-text-muted)] bg-[var(--theme-background)] text-[var(--theme-text)] ring-1 ring-[var(--theme-text-muted)]" : "border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-background)]"}`}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block space-y-2"><span className="text-xs font-medium text-[var(--theme-text)]">Identifique o veículo</span><input value={vehicleDescription} onChange={(event) => setVehicleDescription(event.target.value)} placeholder="Marca, modelo e matrícula (ex.: Toyota Hiace LD-00-00-XX)" className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-text)]" /><span className="block text-[11px] leading-5 text-[var(--theme-text-muted)]">Inclua a matrícula, se possível, para o prestador reconhecer o veículo.</span></label>
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-3 text-[11px] leading-5 text-[var(--theme-text-muted)]">Se estiver numa via perigosa, mantenha-se num local seguro e indique um ponto de referência nas observações. O pedido não substitui os serviços de emergência.</div>
        </>}
        <label className="block space-y-2"><span className="text-xs font-medium text-[var(--theme-text)]">{service === "WATER_DELIVERY" ? "Acesso ao local" : service === "ROADSIDE_ASSISTANCE" ? "Ponto de referência / detalhes da avaria" : "Instruções para o prestador"} <span className="text-[var(--theme-text-faint)]">(opcional)</span></span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={service === "WATER_DELIVERY" ? "Ex.: portão estreito, entrada pela rua lateral, contacto no local…" : service === "ROADSIDE_ASSISTANCE" ? "Ex.: junto à bomba, pneu furado, veículo não arranca…" : "Ex.: horário de recolha, acesso ao local, cuidados com a carga…"} className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-text-muted)]" /></label>
        {!organizationId && <p role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/[.05] px-4 py-3 text-xs text-amber-700 dark:text-amber-300">Seleccione uma organização activa no topo da aplicação para poder registar o pedido.</p>}
        {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/[.04] px-4 py-3 text-xs text-red-600 dark:text-red-300">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-500/20 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">{message}</p>}
        <div className="flex flex-col gap-3 border-t border-[var(--theme-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-5 text-[var(--theme-text-muted)]">{service === "ROADSIDE_ASSISTANCE" ? "Receberá a cotação e as condições antes de autorizar o despacho. O envio do pedido não activa automaticamente um reboque." : "Receberá uma proposta antes de confirmar. O envio do pedido não implica pagamento nem despacho."}</p>
          <button type="submit" disabled={submitting || !organizationId || locationSearching} className="min-h-12 rounded-xl bg-[var(--theme-text)] px-6 text-xs font-semibold text-[var(--theme-background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "A enviar pedido…" : locationSearching ? "A confirmar localização…" : service === "CARGO_SHIPMENT" ? "Solicitar transporte" : service === "WATER_DELIVERY" ? "Solicitar entrega" : "Pedir assistência"}</button>
        </div>
      </form>
    </section>
  );
}
