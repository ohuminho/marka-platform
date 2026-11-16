"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

type ServiceType = "CARGO_SHIPMENT" | "WATER_DELIVERY" | "ROADSIDE_ASSISTANCE";
type VehicleKind = "CARGO_TRICYCLE" | "PICKUP" | "CARGO_VAN" | "LIGHT_TRUCK" | "FLATBED_TRUCK" | "TIPPER_TRUCK" | "HEAVY_TRUCK" | "WATER_TANKER" | "TOW_TRUCK" | "SERVICE_VEHICLE" | "SPECIALIZED";
type CapacityUnit = "KG" | "TON" | "M3" | "LITRE";
type VehicleDraft = {
  key: string;
  kind: VehicleKind;
  registrationNumber: string;
  make: string;
  model: string;
  capacity: string;
  capacityUnit: CapacityUnit;
  waterType: "POTABLE_WATER" | "NON_POTABLE_WATER";
  cargoBody: "OPEN" | "BOX" | "FLATBED" | "TIPPER" | "TANK";
};
type RegisteredVehicle = {
  id: string;
  kind: VehicleKind;
  status: string;
  registrationNumber: string | null;
  make: string | null;
  model: string | null;
  capacity: number | string | null;
  capacityUnit: CapacityUnit | null;
  waterType: string | null;
  cargoBody: VehicleDraft["cargoBody"] | null;
};
type Provider = {
  id: string;
  displayName: string;
  legalName: string | null;
  phone: string | null;
  taxNumber: string | null;
  serviceTypes: ServiceType[];
  coverageAreas: string[];
  status: string;
  availability: string;
  vehicles: RegisteredVehicle[];
};

const serviceOptions: { value: ServiceType; label: string; description: string }[] = [
  { value: "CARGO_SHIPMENT", label: "Transporte de carga", description: "Mercadorias, materiais e equipamentos" },
  { value: "WATER_DELIVERY", label: "Entrega de água", description: "Cisternas de água potável ou não potável" },
  { value: "ROADSIDE_ASSISTANCE", label: "Assistência rodoviária", description: "Reboque, avaria e apoio no local" },
];

const vehicleOptions: { value: VehicleKind; label: string }[] = [
  { value: "CARGO_TRICYCLE", label: "Triciclo de carga" },
  { value: "PICKUP", label: "Pick-up" },
  { value: "CARGO_VAN", label: "Carrinha fechada" },
  { value: "LIGHT_TRUCK", label: "Canter / Dyna" },
  { value: "FLATBED_TRUCK", label: "Camião plataforma" },
  { value: "TIPPER_TRUCK", label: "Camião basculante" },
  { value: "HEAVY_TRUCK", label: "Camião pesado" },
  { value: "WATER_TANKER", label: "Cisterna de água" },
  { value: "TOW_TRUCK", label: "Reboque" },
  { value: "SERVICE_VEHICLE", label: "Viatura de assistência" },
  { value: "SPECIALIZED", label: "Viatura especializada" },
];

const cargoKinds: VehicleKind[] = ["CARGO_TRICYCLE", "PICKUP", "CARGO_VAN", "LIGHT_TRUCK", "FLATBED_TRUCK", "TIPPER_TRUCK", "HEAVY_TRUCK", "SPECIALIZED"];
const emptyVehicle = (): VehicleDraft => ({
  key: globalThis.crypto.randomUUID(),
  kind: "PICKUP",
  registrationNumber: "",
  make: "",
  model: "",
  capacity: "",
  capacityUnit: "KG",
  waterType: "POTABLE_WATER",
  cargoBody: "OPEN",
});

function serviceHasVehicle(service: ServiceType, vehicles: Array<{
  kind: VehicleKind;
  capacity?: number | string | null;
  capacityUnit?: string | null;
  waterType?: string | null;
}>) {
  if (service === "CARGO_SHIPMENT") {
    return vehicles.some((vehicle) => cargoKinds.includes(vehicle.kind) && Number(vehicle.capacity) > 0 && ["KG", "TON", "M3", "LITRE"].includes(vehicle.capacityUnit ?? ""));
  }
  if (service === "WATER_DELIVERY") {
    return vehicles.some((vehicle) => vehicle.kind === "WATER_TANKER" && Number(vehicle.capacity) > 0 && ["LITRE", "M3"].includes(vehicle.capacityUnit ?? "") && Boolean(vehicle.waterType));
  }
  return vehicles.some((vehicle) => vehicle.kind === "TOW_TRUCK" || vehicle.kind === "SERVICE_VEHICLE");
}

export default function MobilityFreightProviderRegistration() {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.id;
  const [provider, setProvider] = useState<Provider | null>(null);
  const [activeVehicles, setActiveVehicles] = useState<RegisteredVehicle[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(["CARGO_SHIPMENT"]);
  const [coverageAreas, setCoverageAreas] = useState("");
  const [vehicles, setVehicles] = useState<VehicleDraft[]>([]);
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    const load = async () => {
      setError(null);
      try {
        const response = await fetch("/api/freight/providers/me", {
          credentials: "include",
          cache: "no-store",
          headers: { "X-Organization-Id": organizationId },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? "Não foi possível carregar o registo do prestador.");
        if (cancelled) return;
        const current = data.provider as Provider | null;
        setProvider(current);
        if (!current) return;
        setDisplayName(current.displayName ?? "");
        setLegalName(current.legalName ?? "");
        setPhone(current.phone ?? "");
        setTaxNumber(current.taxNumber ?? "");
        setServiceTypes(current.serviceTypes ?? []);
        setCoverageAreas((current.coverageAreas ?? []).join("\n"));
        const active = (current.vehicles ?? []).filter((vehicle) => vehicle.status === "ACTIVE");
        setActiveVehicles(active);
        setVehicles((current.vehicles ?? []).filter((vehicle) => vehicle.status === "PENDING").map((vehicle) => ({
          key: vehicle.id,
          kind: vehicle.kind,
          registrationNumber: vehicle.registrationNumber ?? "",
          make: vehicle.make ?? "",
          model: vehicle.model ?? "",
          capacity: vehicle.capacity === null ? "" : String(vehicle.capacity),
          capacityUnit: vehicle.capacityUnit ?? "KG",
          waterType: (vehicle.waterType as VehicleDraft["waterType"]) ?? "POTABLE_WATER",
          cargoBody: vehicle.cargoBody ?? "OPEN",
        })));
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Falha ao carregar o registo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const timer = window.setTimeout(() => { setLoading(true); void load(); }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [organizationId]);

  const toggleService = (value: ServiceType) => {
    setServiceTypes((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  };

  const updateVehicle = (key: string, patch: Partial<VehicleDraft>) => {
    setVehicles((current) => current.map((vehicle) => vehicle.key === key ? { ...vehicle, ...patch } : vehicle));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!organizationId) {
      setError("Seleccione uma organização activa.");
      return;
    }
    if (!displayName.trim() || serviceTypes.length === 0) {
      setError("Indique o nome comercial e pelo menos um serviço.");
      return;
    }

    const validVehicles = vehicles.filter((vehicle) => vehicle.registrationNumber.trim() || vehicle.capacity.trim() || vehicle.make.trim() || vehicle.model.trim());
    if (!provider && validVehicles.length === 0) {
      setError("Registe pelo menos uma viatura para iniciar a candidatura.");
      return;
    }
    const allVehicles = [...activeVehicles, ...validVehicles];
    const missingService = serviceTypes.find((service) => !serviceHasVehicle(service, allVehicles));
    if (missingService) {
      setError("Cada serviço seleccionado precisa de pelo menos uma viatura compatível e registada.");
      return;
    }

    for (const vehicle of validVehicles) {
      if (cargoKinds.includes(vehicle.kind) && (!Number.isFinite(Number(vehicle.capacity)) || Number(vehicle.capacity) <= 0 || !vehicle.capacityUnit)) {
        setError("As viaturas de carga exigem capacidade e unidade de medida válidas.");
        return;
      }
      if (vehicle.kind === "WATER_TANKER" && (!Number.isFinite(Number(vehicle.capacity)) || Number(vehicle.capacity) <= 0 || !["LITRE", "M3"].includes(vehicle.capacityUnit) || !vehicle.waterType)) {
        setError("A cisterna exige capacidade, litros ou m³ e tipo de água.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        displayName: displayName.trim(),
        legalName: legalName.trim() || undefined,
        phone: phone.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
        serviceTypes,
        coverageAreas: coverageAreas.split("\n").map((area) => area.trim()).filter(Boolean),
      };
      if (provider || validVehicles.length > 0) {
        payload.vehicles = validVehicles.map((vehicle) => ({
          kind: vehicle.kind,
          registrationNumber: vehicle.registrationNumber.trim() || undefined,
          make: vehicle.make.trim() || undefined,
          model: vehicle.model.trim() || undefined,
          capacity: vehicle.capacity.trim() ? Number(vehicle.capacity) : undefined,
          capacityUnit: vehicle.capacity.trim() ? vehicle.capacityUnit : undefined,
          waterType: vehicle.kind === "WATER_TANKER" ? vehicle.waterType : undefined,
          cargoBody: vehicle.cargoBody,
          serviceAreas: coverageAreas.split("\n").map((area) => area.trim()).filter(Boolean),
        }));
      }
      const response = await fetch("/api/freight/providers/me", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Não foi possível guardar a candidatura.");
      setProvider(data.provider ?? null);
      setVehicles([]);
      setNotice("Dados submetidos. As viaturas novas ficam pendentes até à validação da equipa MARKA.");
      window.dispatchEvent(new Event("marka:freight-provider-updated"));
      const reload = await fetch("/api/freight/providers/me", {
        credentials: "include",
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      });
      const latest = await reload.json();
      if (reload.ok && latest.provider) {
        setProvider(latest.provider);
        setActiveVehicles((latest.provider.vehicles ?? []).filter((vehicle: RegisteredVehicle) => vehicle.status === "ACTIVE"));
        setVehicles((latest.provider.vehicles ?? []).filter((vehicle: RegisteredVehicle) => vehicle.status === "PENDING").map((vehicle: RegisteredVehicle) => ({
          key: vehicle.id,
          kind: vehicle.kind,
          registrationNumber: vehicle.registrationNumber ?? "",
          make: vehicle.make ?? "",
          model: vehicle.model ?? "",
          capacity: vehicle.capacity === null ? "" : String(vehicle.capacity),
          capacityUnit: vehicle.capacityUnit ?? "KG",
          waterType: (vehicle.waterType as VehicleDraft["waterType"]) ?? "POTABLE_WATER",
          cargoBody: vehicle.cargoBody ?? "OPEN",
        })));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a candidatura.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <div className="max-w-3xl">
        <p className="text-[9px] font-semibold uppercase tracking-[.22em] text-[#b89a5b]">Rede logística MARKA</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--theme-text)]">Registo de prestador de serviços</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">Registe a empresa ou actividade, as áreas de cobertura e as viaturas reais. Só viaturas activadas e com capacidade compatível recebem ofertas.</p>
      </div>

      {provider && <div className="mt-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-xs text-[var(--theme-text-muted)]">
        Estado da candidatura: <strong className="text-[var(--theme-text)]">{provider.status.replaceAll("_", " ")}</strong>
        {activeVehicles.length > 0 && <span> · {activeVehicles.length} viatura(s) activa(s)</span>}
      </div>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-500/20 p-3 text-xs text-emerald-700 dark:text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-500/20 p-3 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
      {loading ? <p className="mt-5 text-sm text-[var(--theme-text-muted)]">A carregar registo…</p> : (
        <form onSubmit={submit} className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-xs font-medium text-[var(--theme-text)]">Nome comercial<input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm" placeholder="Nome do prestador" /></label>
            <label className="space-y-2 text-xs font-medium text-[var(--theme-text)]">Nome legal (opcional)<input value={legalName} onChange={(event) => setLegalName(event.target.value)} maxLength={160} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm" /></label>
            <label className="space-y-2 text-xs font-medium text-[var(--theme-text)]">Contacto telefónico<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm" /></label>
            <label className="space-y-2 text-xs font-medium text-[var(--theme-text)]">NIF (opcional)<input value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} maxLength={40} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm" /></label>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-[var(--theme-text)]">Serviços que pretende prestar</legend>
            <div className="grid gap-2 md:grid-cols-3">
              {serviceOptions.map((option) => <label key={option.value} className="flex cursor-pointer gap-3 rounded-xl border border-[var(--theme-border)] p-3">
                <input type="checkbox" checked={serviceTypes.includes(option.value)} onChange={() => toggleService(option.value)} className="mt-1 accent-[#b89a5b]" />
                <span><span className="block text-xs font-semibold text-[var(--theme-text)]">{option.label}</span><span className="mt-1 block text-[10px] leading-4 text-[var(--theme-text-muted)]">{option.description}</span></span>
              </label>)}
            </div>
          </fieldset>

          <label className="block space-y-2 text-xs font-medium text-[var(--theme-text)]">Municípios ou zonas de cobertura (uma por linha)<textarea rows={3} value={coverageAreas} onChange={(event) => setCoverageAreas(event.target.value)} placeholder={"Luanda\nViana\nCacuaco"} className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm" /></label>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-sm font-semibold text-[var(--theme-text)]">Viaturas para validação</h3><p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">A capacidade tem de corresponder à unidade da carga que a viatura pode transportar.</p></div>
              <button type="button" onClick={() => setVehicles((current) => [...current, emptyVehicle()])} className="min-h-10 rounded-full border border-[var(--theme-border)] px-4 text-xs font-semibold text-[var(--theme-text)]">Adicionar viatura +</button>
            </div>

            {activeVehicles.map((vehicle) => <div key={vehicle.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.035] p-3 text-xs text-[var(--theme-text-muted)]">
              <strong className="text-[var(--theme-text)]">{vehicle.kind.replaceAll("_", " ")}</strong>{vehicle.registrationNumber ? ` · ${vehicle.registrationNumber}` : ""}{vehicle.make || vehicle.model ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(" ")}` : ""} — activa
              {vehicle.capacity !== null && <span> · capacidade {vehicle.capacity} {vehicle.capacityUnit}</span>}
            </div>)}

            {vehicles.map((vehicle, index) => {
              const needsCapacity = cargoKinds.includes(vehicle.kind) || vehicle.kind === "WATER_TANKER";
              return <div key={vehicle.key} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-4">
                <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold text-[var(--theme-text)]">Viatura {index + 1}</p><button type="button" onClick={() => setVehicles((current) => current.filter((item) => item.key !== vehicle.key))} className="text-[10px] text-rose-600">Remover</button></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-xs text-[var(--theme-text)]">Categoria<select value={vehicle.kind} onChange={(event) => { const kind = event.target.value as VehicleKind; updateVehicle(vehicle.key, { kind, capacityUnit: kind === "WATER_TANKER" ? "LITRE" : "KG", cargoBody: kind === "WATER_TANKER" ? "TANK" : kind === "TIPPER_TRUCK" ? "TIPPER" : kind === "CARGO_VAN" ? "BOX" : kind === "FLATBED_TRUCK" ? "FLATBED" : "OPEN" }); }} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3"><option value="">Seleccione</option>{vehicleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  <label className="space-y-2 text-xs text-[var(--theme-text)]">Matrícula<input value={vehicle.registrationNumber} onChange={(event) => updateVehicle(vehicle.key, { registrationNumber: event.target.value })} maxLength={40} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3" /></label>
                  <label className="space-y-2 text-xs text-[var(--theme-text)]">Marca<input value={vehicle.make} onChange={(event) => updateVehicle(vehicle.key, { make: event.target.value })} maxLength={80} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3" /></label>
                  <label className="space-y-2 text-xs text-[var(--theme-text)]">Modelo<input value={vehicle.model} onChange={(event) => updateVehicle(vehicle.key, { model: event.target.value })} maxLength={80} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3" /></label>
                  {needsCapacity && <>
                    <label className="space-y-2 text-xs text-[var(--theme-text)]">Capacidade<input required type="number" min="0.01" step="any" value={vehicle.capacity} onChange={(event) => updateVehicle(vehicle.key, { capacity: event.target.value })} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3" /></label>
                    <label className="space-y-2 text-xs text-[var(--theme-text)]">Unidade<select value={vehicle.capacityUnit} onChange={(event) => updateVehicle(vehicle.key, { capacityUnit: event.target.value as CapacityUnit })} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3">{(vehicle.kind === "WATER_TANKER" ? ["LITRE", "M3"] : ["KG", "TON", "M3", "LITRE"]).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
                  </>}
                  {vehicle.kind === "WATER_TANKER" && <label className="space-y-2 text-xs text-[var(--theme-text)]">Tipo de água<select value={vehicle.waterType} onChange={(event) => updateVehicle(vehicle.key, { waterType: event.target.value as VehicleDraft["waterType"] })} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3"><option value="POTABLE_WATER">Potável</option><option value="NON_POTABLE_WATER">Não potável</option></select></label>}
                  <label className="space-y-2 text-xs text-[var(--theme-text)]">Tipo de caixa<select value={vehicle.cargoBody} onChange={(event) => updateVehicle(vehicle.key, { cargoBody: event.target.value as VehicleDraft["cargoBody"] })} className="min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3"><option value="OPEN">Aberta</option><option value="BOX">Fechada</option><option value="FLATBED">Plataforma</option><option value="TIPPER">Basculante</option><option value="TANK">Cisterna</option></select></label>
                </div>
              </div>;
            })}
            {vehicles.length === 0 && activeVehicles.length === 0 && <p className="rounded-xl border border-dashed border-[var(--theme-border)] p-4 text-center text-xs text-[var(--theme-text-muted)]">Adicione uma viatura para iniciar a candidatura.</p>}
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--theme-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-[10px] leading-5 text-[var(--theme-text-muted)]">O registo não activa automaticamente o prestador. A MARKA valida os dados e os documentos antes de disponibilizar pedidos.</p>
            <button type="submit" disabled={saving} className="min-h-12 rounded-xl bg-[#d8c18c] px-6 text-xs font-bold text-[#171814] disabled:opacity-50">{saving ? "A submeter…" : provider ? "Guardar dados do prestador" : "Submeter candidatura"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
