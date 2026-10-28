"use client";

import { useCallback, useEffect, useState } from "react";

type DriverRide = {
  id: string;
  reference: string;
  status: string;
  serviceType: string;
  currency: string;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

type HistoryPayload = {
  rides?: DriverRide[];
  summary?: { total: number; completed: number; cancelled: number };
  message?: string;
};

const moneylessStatus: Record<string, string> = {
  TRIP_COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
  NO_DRIVER_FOUND: "Sem motorista",
  FAILED: "Falhada",
  DISPUTED: "Em disputa",
};

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export default function DriverTripHistory() {
  const [payload, setPayload] = useState<HistoryPayload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/mobility/driver/history", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await response.json()) as HistoryPayload;
      if (!response.ok) throw new Error(data.message || "Histórico indisponível.");
      setPayload(data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const summary = payload.summary ?? { total: 0, completed: 0, cancelled: 0 };

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-muted)]">Registo operacional</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-2xl">Histórico de viagens</h2>
          <p className="mt-2 text-sm text-[var(--theme-text-muted)]">Últimas viagens associadas ao seu perfil. Os valores financeiros não são estimados nem calculados neste painel.</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); void load(); }} className="rounded-xl border border-[var(--theme-border)] px-3 py-2 text-xs font-semibold text-[var(--theme-text)] transition hover:opacity-80">Atualizar</button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          ["Registos", summary.total],
          ["Concluídas", summary.completed],
          ["Não concluídas", summary.cancelled],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)]/40 p-3 sm:p-4">
            <p className="text-[9px] uppercase tracking-[0.14em] text-[var(--theme-text-muted)] sm:text-[10px]">{label}</p>
            <p className="mt-2 text-xl font-semibold text-[var(--theme-text)]">{value}</p>
          </div>
        ))}
      </div>

      {error && <p role="status" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{error}</p>}
      {loading && <p className="mt-5 text-sm text-[var(--theme-text-muted)]">A carregar o histórico…</p>}
      {!loading && !error && (payload.rides?.length ?? 0) === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--theme-border)] p-6 text-center">
          <p className="text-sm font-medium text-[var(--theme-text)]">Ainda não existem viagens no histórico.</p>
          <p className="mt-1 text-xs text-[var(--theme-text-muted)]">As viagens serão apresentadas aqui quando o seu perfil estiver associado a uma operação.</p>
        </div>
      )}
      {!!payload.rides?.length && (
        <div className="mt-5 space-y-3">
          {payload.rides.map((ride) => (
            <article key={ride.id} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)]/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-[var(--theme-text)]">{ride.reference}</p>
                  <p className="mt-1 text-[11px] text-[var(--theme-text-muted)]">{dateLabel(ride.completedAt ?? ride.cancelledAt ?? ride.requestedAt)}</p>
                </div>
                <span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-[10px] font-semibold text-[var(--theme-text-muted)]">{moneylessStatus[ride.status] ?? ride.status}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div><p className="text-[9px] uppercase tracking-[0.15em] text-[var(--theme-text-muted)]">Recolha</p><p className="mt-1 text-sm text-[var(--theme-text)]">{ride.pickupAddress || "Localização registada na viagem"}</p></div>
                <div><p className="text-[9px] uppercase tracking-[0.15em] text-[var(--theme-text-muted)]">Destino</p><p className="mt-1 text-sm text-[var(--theme-text)]">{ride.dropoffAddress || "Destino registado na viagem"}</p></div>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="mt-4 text-[10px] text-[var(--theme-text-muted)]">São apresentados até 30 registos recentes. Esta lista não substitui recibos, liquidação ou extratos oficiais.</p>
    </section>
  );
}
