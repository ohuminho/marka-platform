"use client";

import Link from "next/link";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

interface MobilityOverview {
  generatedAt: string;

  metrics: {
    rides: {
      total: number;
      active: number;
      completed: number;
      cancelled: number;
      failed: number;
      noDriverFound: number;
    };

    orchestration: {
      active: number;
      completed: number;
      failed: number;
      recoveryRequired: number;
      cancelled: number;
    };

    payments: {
      pending: number;
      authorized: number;
      collected: number;
      settled: number;
      failed: number;
      disputed: number;
    };

    settlements: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
  };

  recentRides: Array<{
    id: string;
    reference: string;
    serviceType: string;
    status: string;
    currency: string;
    createdAt: string;
    updatedAt: string;
    orchestrationStatus: string | null;
    currentStep: string | null;
    orchestrationUpdatedAt: string | null;
  }>;

  recentEvents: Array<{
    id: string;
    rideId: string;
    action: string;
    fromStep: string | null;
    toStep: string;
    status: string;
    createdAt: string;
  }>;
}


const LIFECYCLE_STEPS = [
  "REQUESTED",
  "SAFETY_READY",
  "SEARCHING",
  "DRIVER_ASSIGNED",
  "DRIVER_ACCEPTED",
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
  "TRIP_STARTED",
  "TRIP_IN_PROGRESS",
  "TRIP_COMPLETED",
  "PAYMENT_INITIALIZED",
  "FINANCIAL_FINALIZED",
] as const;

function formatStep(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(
      "pt-PT",
      {
        dateStyle: "short",
        timeStyle: "short",
      },
    ).format(new Date(value));
  } catch {
    return value;
  }
}

function StatusPill({
  value,
}: {
  value: string;
}) {
  const normalized =
    value.toUpperCase();

  const positive =
    normalized === "COMPLETED" ||
    normalized === "SETTLED" ||
    normalized === "ELIGIBLE" ||
    normalized === "ACTIVE";

  const warning =
    normalized === "PROCESSING" ||
    normalized === "PENDING" ||
    normalized === "SEARCHING" ||
    normalized === "RECOVERY_REQUIRED";

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5
        py-1
        text-[9px]
        font-semibold
        uppercase
        tracking-[0.14em]
        ${
          positive
            ? "border-[var(--theme-border)] bg-[var(--theme-surface-strong)] text-[color-mix(in_srgb,var(--theme-text)_75%,transparent)]"
            : warning
              ? "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[color-mix(in_srgb,var(--theme-text)_50%,transparent)]"
              : "border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-background)_20%,transparent)] text-[color-mix(in_srgb,var(--theme-text)_35%,transparent)]"
        }
      `}
    >
      {formatStep(value)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-[var(--theme-border)]
        bg-[var(--theme-surface)]
        p-5
      "
    >
      <p
        className="
          text-[9px]
          font-semibold
          uppercase
          tracking-[0.25em]
          text-[var(--theme-text-faint)]
        "
      >
        {label}
      </p>

      <p
        className="
          mt-4
          text-3xl
          font-medium
          tracking-[-0.04em]
          text-[var(--theme-text)]/90
        "
      >
        {value}
      </p>

      <p className="mt-2 text-[10px] text-[var(--theme-text-faint)]">
        {detail}
      </p>
    </div>
  );
}

export default function MobilityControlCenter() {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.id;
  const [overview, setOverview] =
    useState<MobilityOverview | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [selectedRideId, setSelectedRideId] =
    useState<string | null>(null);

  const loadOverview =
    useCallback(async () => {
      if (!organizationId) {
        setOverview(null);
        setError("Selecione uma organização ativa para consultar a operação Mobility.");
        setLoading(false);
        return;
      }
      try {
        const response =
          await fetch(
            "/api/mobility/overview",
            {
              cache: "no-store",
              credentials: "include",
              headers: { "X-Organization-Id": organizationId },
            },
          );

        const data =
          (await response.json()) as
            | MobilityOverview
            | {
                message?: string;
              };

        if (!response.ok) {
          throw new Error(
            "message" in data &&
              data.message
              ? data.message
              : "Unable to load Mobility overview.",
          );
        }

        setOverview(
          data as MobilityOverview,
        );

        setError(null);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load Mobility overview.",
        );
      } finally {
        setLoading(false);
      }
    }, [organizationId]);

  useEffect(() => {
  const initialLoadTimer = window.setTimeout(() => {
    void loadOverview();
  }, 0);

  const interval = window.setInterval(() => {
    void loadOverview();
  }, 5000);

  return () => {
    window.clearTimeout(initialLoadTimer);
    window.clearInterval(interval);
  };
}, [loadOverview]);

  const selectedRide =
    useMemo(
      () =>
        overview?.recentRides.find(
          (ride) =>
            ride.id ===
            selectedRideId,
        ) ?? null,
      [
        overview,
        selectedRideId,
      ],
    );

  const currentStep =
    selectedRide?.currentStep ??
    null;

  const currentStepIndex =
    currentStep
      ? LIFECYCLE_STEPS.indexOf(
          currentStep as
            (typeof LIFECYCLE_STEPS)[number],
        )
      : -1;

  return (
    <div className="space-y-8">
      <section
        className="
          relative
          overflow-hidden
          rounded-[2rem]
          border
          border-[var(--theme-border)]
          bg-[var(--theme-surface)]
          px-6
          py-8
          shadow-[0_30px_100px_rgba(0,0,0,0.25)]
          sm:px-9
          sm:py-10
          lg:px-12
        "
      >
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -right-40
            -top-40
            h-[32rem]
            w-[32rem]
            rounded-full
            bg-[var(--theme-surface)]
            blur-[110px]
          "
        />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div
              className="
                flex
                items-center
                gap-3
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.32em]
                text-[var(--theme-text-muted)]
              "
            >
              <span className="h-px w-8 bg-[var(--theme-surface-strong)]/20" />
              Mobility Control Center
            </div>

            <h1
              className="
                mt-6
                text-4xl
                font-semibold
                leading-[0.95]
                tracking-[-0.045em]
                text-[var(--theme-text)]
                sm:text-5xl
              "
            >
              Operação Mobility.
              <br />
              Uma visão operacional.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--theme-text)]/40">
              Acompanhe o estado das viagens, a orquestração, os eventos e os indicadores financeiros da organização ativa.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
              Actualização automática · 5 s
            </span>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadOverview();
              }}
              className="
                rounded-full
                border
                border-[var(--theme-border)]
                bg-[var(--theme-surface)]
                px-4
                py-2
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-[var(--theme-text)]/45
                transition
                hover:border-[var(--theme-border)]
                hover:text-[var(--theme-text)]
              "
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div
          className="
            rounded-2xl
            border
            border-[var(--theme-border)]
            bg-[var(--theme-surface)]
            px-5
            py-4
            text-xs
            text-[var(--theme-text-muted)]
          "
        >
          {error}
        </div>
      )}

      <section>
        <div className="mb-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--theme-text-faint)]">
            Operational intelligence
          </p>

          <h2 className="mt-2 text-xl font-medium text-[var(--theme-text)]/85">
            Mobility in real time
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Rides"
            value={
              loading
                ? "—"
                : overview?.metrics.rides.total ??
                  0
            }
            detail="Total rides"
          />

          <MetricCard
            label="Active"
            value={
              loading
                ? "—"
                : overview?.metrics.rides.active ??
                  0
            }
            detail="Current mobility flow"
          />

          <MetricCard
            label="Completed"
            value={
              loading
                ? "—"
                : overview?.metrics.rides.completed ??
                  0
            }
            detail="Completed trips"
          />

          <MetricCard
            label="Recovery"
            value={
              loading
                ? "—"
                : overview?.metrics.orchestration
                    .recoveryRequired ??
                  0
            }
            detail="Financial recovery required"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[var(--theme-text-faint)]">Estado operacional</p>
        <p className="mt-2 text-xs leading-5 text-[var(--theme-text-muted)]">Os indicadores abaixo são consultados na API da organização ativa. As permissões de administração são novamente verificadas no servidor.</p>
        {overview?.generatedAt && <p className="mt-2 text-[10px] text-[var(--theme-text-faint)]">Última atualização: {formatDate(overview.generatedAt)}</p>}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div
          className="
            rounded-[1.75rem]
            border
            border-[var(--theme-border)]
            bg-[var(--theme-surface)]
            p-6
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--theme-text-faint)]">
                Ride lifecycle
              </p>

              <h2 className="mt-2 text-xl font-medium text-[var(--theme-text)]/85">
                Operational pipeline
              </h2>
            </div>

            {currentStep && (
              <StatusPill
                value={currentStep}
              />
            )}
          </div>

          <div className="mt-8 space-y-3">
            {LIFECYCLE_STEPS.map(
              (step, index) => {
                const reached =
                  currentStepIndex >=
                  index;

                const current =
                  currentStep ===
                  step;

                return (
                  <div
                    key={step}
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >
                    <div
                      className={`
                        flex
                        h-7
                        w-7
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border
                        text-[9px]
                        ${
                          current
                            ? "border-[var(--theme-accent-strong)] bg-[var(--theme-text)] text-[var(--theme-background)]"
                            : reached
                              ? "border-[var(--theme-border)] bg-[var(--theme-surface-strong)] text-[var(--theme-text)]"
                              : "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-faint)]"
                        }
                      `}
                    >
                      {index + 1}
                    </div>

                    <div
                      className={`
                        h-px
                        w-5
                        ${
                          reached
                            ? "bg-[var(--theme-surface-strong)]/25"
                            : "bg-[var(--theme-surface)]"
                        }
                      `}
                    />

                    <span
                      className={`
                        text-[10px]
                        uppercase
                        tracking-[0.14em]
                        ${
                          current
                            ? "text-[var(--theme-text)]"
                            : reached
                              ? "text-[var(--theme-text-muted)]"
                              : "text-[var(--theme-text-faint)]"
                        }
                      `}
                    >
                      {formatStep(
                        step,
                      )}
                    </span>
                  </div>
                );
              },
            )}
          </div>
        </div>

        <div className="relative isolate overflow-hidden rounded-[1.9rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">
            Gestão operacional
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--theme-text)]">
            Monitorização de viagens
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">
            Este espaço apresenta a operação real da organização. Os pedidos de viagem são criados pelo passageiro; o painel administrativo não cria viagens em nome do administrador.
          </p>
          <div className="mt-6 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)]/30 p-4">
            <p className="text-xs font-semibold text-[var(--theme-text)]">Despacho manual</p>
            <p className="mt-2 text-xs leading-5 text-[var(--theme-text-muted)]">
              A atribuição manual e a intervenção administrativa numa corrida ainda não estão disponíveis nesta API. Não apresentamos controlos que possam alterar incorretamente o passageiro responsável pela viagem.
            </p>
          </div>
          <Link href="/app/admin/mobility/drivers" className="mt-5 inline-flex h-11 items-center rounded-full border border-[var(--theme-border)] px-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">
            Rever motoristas e documentos <span className="ml-3">→</span>
          </Link>
        </div> </form>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div
          className="
            rounded-[1.75rem]
            border
            border-[var(--theme-border)]
            bg-[var(--theme-surface)]
            p-6
          "
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--theme-text-faint)]">
                Recent rides
              </p>

              <h2 className="mt-2 text-xl font-medium text-[var(--theme-text)]/85">
                Mobility activity
              </h2>
            </div>

            <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-faint)]">
              Live
            </span>
          </div>

          <div className="mt-6 space-y-2">
            {overview?.recentRides.length ? (
              overview.recentRides.map(
                (ride) => (
                  <button
                    key={ride.id}
                    type="button"
                    onClick={() =>
                      setSelectedRideId(
                        ride.id,
                      )
                    }
                    className="
                      flex
                      w-full
                      items-center
                      justify-between
                      gap-4
                      rounded-xl
                      border
                      border-[var(--theme-border)]
                      bg-[var(--theme-surface)]
                      px-4
                      py-3
                      text-left
                      transition
                      hover:border-[var(--theme-border)]
                      hover:bg-[var(--theme-surface)]
                    "
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs text-[var(--theme-text)]">
                        {ride.reference}
                      </p>

                      <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[var(--theme-text-faint)]">
                        {ride.serviceType} ·{" "}
                        {formatDate(
                          ride.createdAt,
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusPill
                        value={ride.status}
                      />

                      {ride.currentStep && (
                        <span className="text-[8px] uppercase tracking-[0.12em] text-[var(--theme-text-faint)]">
                          {formatStep(
                            ride.currentStep,
                          )}
                        </span>
                      )}
                    </div>
                  </button>
                ),
              )
            ) : (
              <p className="py-8 text-center text-xs text-[var(--theme-text-faint)]">
                No Mobility rides yet.
              </p>
            )}
          </div>
        </div>

        <div
          className="
            rounded-[1.75rem]
            border
            border-[var(--theme-border)]
            bg-[var(--theme-surface)]
            p-6
          "
        >
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--theme-text-faint)]">
              Orchestration events
            </p>

            <h2 className="mt-2 text-xl font-medium text-[var(--theme-text)]/85">
              Lifecycle activity
            </h2>
          </div>

          <div className="mt-6 space-y-2">
            {overview?.recentEvents.length ? (
              overview.recentEvents.map(
                (event) => (
                  <div
                    key={event.id}
                    className="
                      rounded-xl
                      border
                      border-[var(--theme-border)]
                      bg-[var(--theme-surface)]
                      px-4
                      py-3
                    "
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-[var(--theme-text-muted)]">
                        {event.action}
                      </p>

                      <StatusPill
                        value={
                          event.status
                        }
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-faint)]">
                        {formatStep(
                          event.fromStep,
                        )}{" "}
                        →{" "}
                        {formatStep(
                          event.toStep,
                        )}
                      </p>

                      <p className="text-[9px] text-[var(--theme-text-faint)]">
                        {formatDate(
                          event.createdAt,
                        )}
                      </p>
                    </div>
                  </div>
                ),
              )
            ) : (
              <p className="py-8 text-center text-xs text-[var(--theme-text-faint)]">
                No orchestration events yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        className="
          rounded-[1.75rem]
          border
          border-[var(--theme-border)]
          bg-[var(--theme-surface)]
          p-6
        "
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--theme-text-faint)]">
              Financial layer
            </p>

            <h2 className="mt-2 text-xl font-medium text-[var(--theme-text)]/85">
              Payment and settlement visibility
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill
              value={`COLLECTED ${
                overview?.metrics.payments
                  .collected ?? 0
              }`}
            />

            <StatusPill
              value={`SETTLED ${
                overview?.metrics.payments
                  .settled ?? 0
              }`}
            />

            <StatusPill
              value={`PROCESSING ${
                overview?.metrics.settlements
                  .processing ?? 0
              }`}
            />

            <StatusPill
              value={`RECOVERY ${
                overview?.metrics.orchestration
                  .recoveryRequired ?? 0
              }`}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-[var(--theme-text-faint)]">
              Payment
            </p>
            <p className="mt-2 text-sm text-[var(--theme-text)]">
              {
                overview?.metrics.payments
                  .collected ?? 0
              }{" "}
              collected
            </p>
          </div>

          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-[var(--theme-text-faint)]">
              Settlement
            </p>
            <p className="mt-2 text-sm text-[var(--theme-text)]">
              {
                overview?.metrics.settlements
                  .completed ?? 0
              }{" "}
              completed
            </p>
          </div>

          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-[var(--theme-text-faint)]">
              Cash obligation
            </p>
            <p className="mt-2 text-sm text-[var(--theme-text)]">
              Financial obligation
            </p>
          </div>

          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-[var(--theme-text-faint)]">
              Recovery
            </p>
            <p className="mt-2 text-sm text-[var(--theme-text)]">
              {
                overview?.metrics.orchestration
                  .recoveryRequired ?? 0
              }{" "}
              requiring action
            </p>
          </div>
        </div>

        {selectedRideId && (
          <Link
            href={`/app/mobility/${selectedRideId}`}
            className="
              mt-5
              inline-flex
              h-11
              items-center
              rounded-full
              border
              border-[var(--theme-border)]
              bg-[var(--theme-surface)]
              px-5
              text-[9px]
              font-semibold
              uppercase
              tracking-[0.18em]
              text-[var(--theme-text-muted)]
              transition
              hover:border-[var(--theme-border)]
              hover:text-[var(--theme-text)]
            "
          >
            Open selected ride
            <span className="ml-3">
              →
            </span>
          </Link>
        )}
      </section>
    </div>
  );
}
