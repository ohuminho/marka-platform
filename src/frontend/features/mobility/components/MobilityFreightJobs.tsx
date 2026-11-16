"use client";

import { useCallback, useEffect, useState } from "react";
import MarkaVehicleIllustration from "@/frontend/features/mobility/components/MarkaVehicleIllustration";
import { canVehicleCarryQuantity } from "@/freight-engine/freight-capacity";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

type FreightVehicle = { id: string; kind: string; registrationNumber?: string | null; status: string; capacity?: number | string | null; capacityUnit?: string | null; waterType?: string | null };
type FreightProvider = { status: string; availability: string; vehicles: FreightVehicle[] };
type FreightJob = {
  id: string; reference: string; requestType: "CARGO_SHIPMENT" | "WATER_DELIVERY" | "ROADSIDE_ASSISTANCE";
  status: string; origin: { address?: string | null } | null; destination: { address?: string | null } | null;
  quantity: number | null; quantityUnit: string | null; currency: string; details: unknown; paidAt: string | null; pickupDistanceKm?: number | null;
};

const typeLabels: Record<FreightJob["requestType"], string> = {
  CARGO_SHIPMENT: "Transporte de carga", WATER_DELIVERY: "Entrega de água", ROADSIDE_ASSISTANCE: "Assistência rodoviária",
};

export default function MobilityFreightJobs() {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.id;
  const [provider, setProvider] = useState<FreightProvider | null>(null);
  const [jobs, setJobs] = useState<FreightJob[]>([]);
  const [assignedJobs, setAssignedJobs] = useState<FreightJob[]>([]);
  const [vehicleIds, setVehicleIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!organizationId) throw new Error("Seleccione uma organização activa para consultar os pedidos.");
    setError(null);
    const [providerResponse, jobsResponse] = await Promise.all([
      fetch("/api/freight/providers/me", { credentials: "include", cache: "no-store", headers: { "X-Organization-Id": organizationId } }),
      fetch("/api/freight/providers/me/requests", { credentials: "include", cache: "no-store", headers: { "X-Organization-Id": organizationId } }),
    ]);
    const providerData = await providerResponse.json();
    const jobsData = await jobsResponse.json();
    if (!providerResponse.ok) throw new Error(providerData.message ?? "Não foi possível carregar o perfil do prestador.");
    if (!jobsResponse.ok) throw new Error(jobsData.message ?? "Não foi possível carregar os pedidos disponíveis.");
    setProvider(providerData.provider ?? null);
    setJobs(jobsData.requests ?? []);
    setAssignedJobs(jobsData.assignedRequests ?? []);
    const activeVehicles: FreightVehicle[] = (providerData.provider?.vehicles ?? []).filter((vehicle: FreightVehicle) => vehicle.status === "ACTIVE");
    setVehicleIds((current) => Object.fromEntries((jobsData.requests ?? []).map((job: FreightJob) => {
      const details = job.details && typeof job.details === "object" ? job.details as Record<string, unknown> : {};
      const isCompatible = (vehicle: FreightVehicle) => {
        const kinds = job.requestType === "WATER_DELIVERY" ? ["WATER_TANKER"] : job.requestType === "ROADSIDE_ASSISTANCE" ? ["TOW_TRUCK", "SERVICE_VEHICLE"] : ["CARGO_TRICYCLE", "PICKUP", "CARGO_VAN", "LIGHT_TRUCK", "FLATBED_TRUCK", "TIPPER_TRUCK", "HEAVY_TRUCK", "SPECIALIZED"];
        if (!kinds.includes(vehicle.kind)) return false;
        if (job.requestType === "ROADSIDE_ASSISTANCE") return true;
        if (job.requestType === "WATER_DELIVERY" && vehicle.waterType !== details.waterType) return false;
        return canVehicleCarryQuantity(vehicle.capacity, vehicle.capacityUnit, job.quantity, job.quantityUnit);
      };
      const selected = activeVehicles.find((vehicle) => vehicle.id === current[job.id] && isCompatible(vehicle));
      const compatible = selected ?? activeVehicles.find(isCompatible);
      return [job.id, compatible?.id ?? ""];
    })));
    setNotice(jobsData.message ?? null);
  }, [organizationId]);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      refresh()
        .catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao carregar pedidos."))
        .finally(() => setLoading(false));
    };
    const timer = window.setTimeout(load, 0);
    window.addEventListener("marka:freight-provider-updated", load);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("marka:freight-provider-updated", load);
    };
  }, [refresh]);
  useEffect(() => {
    if (
      !provider ||
      provider.status !== "VERIFIED" ||
      !["AVAILABLE", "BUSY"].includes(provider.availability) ||
      !navigator.geolocation
    ) return;

    let lastSentAt = 0;
    let active = true;
    const watchId = navigator.geolocation.watchPosition(async (position) => {
      const now = Date.now();
      if (!active || now - lastSentAt < 15000) return;
      lastSentAt = now;
      try {
        const response = await fetch("/api/freight/providers/me/location", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId ?? "" },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          }),
        });
        if (!response.ok && active) {
          const data = await response.json().catch(() => ({}));
          setNotice(data.message ?? "Não foi possível actualizar a localização GPS.");
        }
      } catch {
        if (active) setNotice("Sem ligação para actualizar a localização GPS. A localização será reenviada quando a ligação voltar.");
      }
    }, () => {
      if (active) setNotice("Permita o acesso à localização do dispositivo para receber pedidos de carga.");
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });

    return () => {
      active = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [provider?.id, provider?.status, provider?.availability, organizationId]);

  function nextAction(job: FreightJob): { status: string; label: string } | null {
    if (job.status === "ASSIGNED") return { status: "PROVIDER_EN_ROUTE", label: "Iniciar deslocação" };
    if (job.status === "PROVIDER_EN_ROUTE") return { status: "PROVIDER_ARRIVED", label: "Cheguei ao local" };
    if (job.status === "PROVIDER_ARRIVED") {
      return job.requestType === "ROADSIDE_ASSISTANCE"
        ? { status: "COMPLETED", label: "Concluir assistência" }
        : { status: "PICKED_UP", label: "Confirmar recolha" };
    }
    if (job.status === "PICKED_UP") return { status: "IN_TRANSIT", label: "Iniciar transporte" };
    if (job.status === "IN_TRANSIT") return { status: "COMPLETED", label: "Concluir serviço" };
    return null;
  }

  async function updateJobStatus(job: FreightJob) {
    const action = nextAction(job);
    if (!action) return;
    if (!organizationId) { setError("Seleccione uma organização activa."); return; }
    setBusyId(job.id);
    setError(null);
    try {
      const response = await fetch(`/api/freight/providers/me/requests/${job.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId ?? "" },
        body: JSON.stringify({ status: action.status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Não foi possível actualizar o serviço.");
      await refresh();
      setNotice(`Pedido ${job.reference}: estado actualizado.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao actualizar o serviço.");
    } finally {
      setBusyId(null);
    }
  }

  async function accept(job: FreightJob) {
    const vehicleId = vehicleIds[job.id];
    if (!organizationId) { setError("Seleccione uma organização activa."); return; }
    if (!vehicleId) { setError("Seleccione uma viatura activa antes de aceitar."); return; }
    setBusyId(job.id); setError(null);
    try {
      const response = await fetch(`/api/freight/providers/me/requests/${job.id}/accept`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId }, body: JSON.stringify({ vehicleId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Não foi possível aceitar o pedido.");
      await refresh();
      setNotice(`Pedido ${job.reference} atribuído à sua conta.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao aceitar o pedido."); }
    finally { setBusyId(null); }
  }

  return (
    <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-[#b89a5b]">Despacho de carga e assistência</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--theme-text)]">Pedidos pagos disponíveis</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">Só aparecem pedidos com pagamento confirmado e viaturas compatíveis. A aceitação é exclusiva: o primeiro prestador elegível a confirmar fica com o serviço.</p></div>
        <button type="button" onClick={() => { setLoading(true); refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao actualizar.")).finally(() => setLoading(false)); }} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs font-semibold text-[var(--theme-text)]">Actualizar</button>
      </div>
      {provider && <p className="mt-4 text-[11px] text-[var(--theme-text-muted)]">Estado do prestador: <strong>{provider.status}</strong> · Disponibilidade: <strong>{provider.availability}</strong></p>}
      {notice && <p className="mt-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-xs text-[var(--theme-text-muted)]">{notice}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-700">{error}</p>}
      {assignedJobs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[var(--theme-text)]">Serviços em curso</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {assignedJobs.map((job) => {
              const action = nextAction(job);
              return <article key={job.id} className="rounded-2xl border border-[#d8c18c]/30 bg-[var(--theme-background)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#b89a5b]">{typeLabels[job.requestType]}</p><h4 className="mt-1 text-sm font-semibold text-[var(--theme-text)]">{job.reference}</h4></div>
                  <span className="rounded-full bg-[#d8c18c]/15 px-2.5 py-1 text-[9px] font-semibold text-[var(--theme-text)]">{job.status.replaceAll("_", " ")}</span>
                </div>
                <div className="mt-3 space-y-1 text-xs text-[var(--theme-text-muted)]">
                  <p><strong className="text-[var(--theme-text)]">Recolha:</strong> {job.origin?.address ?? "Não indicada"}</p>
                  <p><strong className="text-[var(--theme-text)]">Destino:</strong> {job.destination?.address ?? "Não indicado"}</p>
                </div>
                {action ? <button type="button" disabled={busyId === job.id} onClick={() => updateJobStatus(job)} className="mt-4 min-h-11 w-full rounded-xl bg-[#d8c18c] px-4 text-xs font-bold text-[#171814] disabled:opacity-50">{busyId === job.id ? "A actualizar…" : action.label}</button> : <p className="mt-4 text-xs text-amber-700">Serviço em excepção. Contacte o suporte para resolução.</p>}
              </article>;
            })}
          </div>
        </div>
      )}
      {loading ? <p className="mt-6 text-sm text-[var(--theme-text-muted)]">A carregar pedidos…</p> : jobs.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-[var(--theme-border)] p-6 text-center text-sm text-[var(--theme-text-muted)]">Não existem pedidos pagos compatíveis disponíveis neste momento.</p> : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {jobs.map((job) => {
            const details = job.details && typeof job.details === "object" ? job.details as Record<string, unknown> : {};
            const vehicles = (provider?.vehicles ?? []).filter((vehicle) => {
              if (vehicle.status !== "ACTIVE") return false;
              const kinds = job.requestType === "WATER_DELIVERY" ? ["WATER_TANKER"] : job.requestType === "ROADSIDE_ASSISTANCE" ? ["TOW_TRUCK", "SERVICE_VEHICLE"] : ["CARGO_TRICYCLE", "PICKUP", "CARGO_VAN", "LIGHT_TRUCK", "FLATBED_TRUCK", "TIPPER_TRUCK", "HEAVY_TRUCK", "SPECIALIZED"];
              if (!kinds.includes(vehicle.kind)) return false;
              if (job.requestType === "ROADSIDE_ASSISTANCE") return true;
              const details = job.details && typeof job.details === "object" ? job.details as Record<string, unknown> : {};
              if (job.requestType === "WATER_DELIVERY" && vehicle.waterType !== details.waterType) return false;
              return canVehicleCarryQuantity(vehicle.capacity, vehicle.capacityUnit, job.quantity, job.quantityUnit);
            });
            const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleIds[job.id]);
            return <article key={job.id} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#b89a5b]">{typeLabels[job.requestType]}</p><h3 className="mt-1 text-sm font-semibold text-[var(--theme-text)]">{job.reference}</h3></div><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] font-semibold text-emerald-700">Pagamento confirmado</span></div>
              <div className="mt-4 space-y-2 text-xs text-[var(--theme-text-muted)]"><p><strong className="text-[var(--theme-text)]">Recolha:</strong> {job.origin?.address ?? "Não indicada"}</p><p><strong className="text-[var(--theme-text)]">Destino:</strong> {job.destination?.address ?? "Não indicado"}</p>{typeof job.pickupDistanceKm === "number" && <p><strong className="text-[var(--theme-text)]">Distância até à recolha:</strong> {job.pickupDistanceKm < 10 ? job.pickupDistanceKm.toFixed(1) : Math.round(job.pickupDistanceKm)} km <span className="text-[var(--theme-text-muted)]">(linha recta)</span></p>}{job.quantity !== null && <p><strong className="text-[var(--theme-text)]">Volume/carga:</strong> {job.quantity} {job.quantityUnit}</p>}{typeof details.vehicleDescription === "string" && <p><strong className="text-[var(--theme-text)]">Veículo:</strong> {details.vehicleDescription}</p>}{typeof details.assistanceType === "string" && <p><strong className="text-[var(--theme-text)]">Assistência:</strong> {details.assistanceType.replaceAll("_", " ")}</p>}{typeof details.waterType === "string" && <p><strong className="text-[var(--theme-text)]">Água:</strong> {details.waterType === "POTABLE_WATER" ? "Potável" : "Não potável"}</p>}</div>
              <label className="mt-4 block text-[10px] font-semibold text-[var(--theme-text-muted)]">Viatura a utilizar<select value={vehicleIds[job.id] ?? ""} onChange={(event) => setVehicleIds((current) => ({ ...current, [job.id]: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-xs text-[var(--theme-text)]"><option value="">Seleccione uma viatura</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.kind.replaceAll("_", " ")}{vehicle.registrationNumber ? ` · ${vehicle.registrationNumber}` : ""}</option>)}</select></label>
              {selectedVehicle && <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2">
                <MarkaVehicleIllustration kind={selectedVehicle.kind} className="h-12 w-28 shrink-0" />
                <div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#B8860B]">Viatura seleccionada</p><p className="mt-1 truncate text-xs font-semibold text-[var(--theme-text)]">{selectedVehicle.kind.replaceAll("_", " ")}{selectedVehicle.registrationNumber ? ` · ${selectedVehicle.registrationNumber}` : ""}</p></div>
              </div>}
              <button type="button" disabled={busyId === job.id || !vehicleIds[job.id]} onClick={() => accept(job)} className="mt-4 min-h-11 w-full rounded-xl bg-[#d8c18c] px-4 text-xs font-bold text-[#171814] disabled:cursor-not-allowed disabled:opacity-50">{busyId === job.id ? "A confirmar…" : "Aceitar pedido"}</button>
            </article>;
          })}
        </div>
      )}
    </section>
  );
}
