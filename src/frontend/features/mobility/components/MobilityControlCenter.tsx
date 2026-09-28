"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type MobilitySafetyMode =
  | "STANDARD"
  | "TRUSTED"
  | "CHILD";

interface MobilityOverview {
  generatedAt: string;

  engines: Record<string, boolean>;

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

interface RideResponse {
  ride?: {
    id: string;
    reference?: string;
    status: string;
    serviceType: string;
    currency: string;
    rider?: {
      name?: string | null;
    };
  };

  orchestration?: {
    orchestrationId?: string;
    rideId?: string;
    status?: string;
    currentStep?: string;
    version?: number;
    attemptCount?: number;
    recoveryRequired?: boolean;
  };

  financials?: unknown;

  recoveryRequired?: boolean;

  message?: string;
}

const ENGINE_REGISTRY = [
  {
    key: "lifecycle",
    name: "Lifecycle Orchestrator",
    layer: "Orchestration",
    description:
      "Coordena o ciclo completo da viagem.",
  },
  {
    key: "ride",
    name: "Ride Engine",
    layer: "Mobility",
    description:
      "Criação, transições e estado da viagem.",
  },
  {
    key: "stateMachine",
    name: "Ride State Machine",
    layer: "Control",
    description:
      "Impede transições inválidas.",
  },
  {
    key: "pricing",
    name: "Pricing Engine",
    layer: "Commercial",
    description:
      "Calcula e preserva o contexto de preço.",
  },
  {
    key: "matching",
    name: "Matching Engine",
    layer: "Dispatch",
    description:
      "Procura candidatos compatíveis.",
  },
  {
    key: "dispatch",
    name: "Dispatch Engine",
    layer: "Dispatch",
    description:
      "Distribui a viagem para o candidato elegível.",
  },
  {
    key: "assignment",
    name: "Driver / Vehicle Assignment",
    layer: "Operations",
    description:
      "Valida e mantém a relação motorista-veículo.",
  },
  {
    key: "safety",
    name: "Safety Engine",
    layer: "Safety",
    description:
      "Identidade, documentos, risco e elegibilidade.",
  },
  {
    key: "payment",
    name: "Payment Engine",
    layer: "Financial",
    description:
      "Regista e finaliza o pagamento da viagem.",
  },
  {
    key: "cashSettlement",
    name: "Cash Obligation Engine",
    layer: "Financial",
    description:
      "Transforma comissão em obrigação financeira no cash.",
  },
  {
    key: "settlement",
    name: "Settlement Engine",
    layer: "Financial",
    description:
      "Fecha a liquidação da viagem.",
  },
  {
    key: "financialOrchestrator",
    name: "Financial Orchestrator",
    layer: "Financial",
    description:
      "Coordena Payment + Settlement + Financial Core.",
  },
  {
    key: "financialCoreBridge",
    name: "Financial Core Bridge",
    layer: "Financial Core",
    description:
      "Liga a Mobility ao ledger financeiro principal.",
  },
  {
    key: "recovery",
    name: "Financial Recovery",
    layer: "Recovery",
    description:
      "Reconcilia e recupera etapas financeiras incompletas.",
  },
  {
    key: "audit",
    name: "Financial Audit",
    layer: "Control",
    description:
      "Regista a trilha auditável das operações.",
  },
  {
    key: "idempotency",
    name: "Idempotency Engine",
    layer: "Control",
    description:
      "Evita duplicação de operações críticas.",
  },
] as const;

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
  const [overview, setOverview] =
    useState<MobilityOverview | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [creating, setCreating] =
    useState(false);

  const [serviceType, setServiceType] =
    useState("TAXI");

  const [safetyMode, setSafetyMode] =
    useState<MobilitySafetyMode>(
      "STANDARD",
    );

  const [pickupAddress, setPickupAddress] =
    useState("");

  const [dropoffAddress, setDropoffAddress] =
    useState("");

  const [activeRide, setActiveRide] =
    useState<RideResponse | null>(null);

  const [selectedRideId, setSelectedRideId] =
    useState<string | null>(null);

  const loadOverview =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/mobility/overview",
            {
              cache: "no-store",
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
    }, []);

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

  const createRide =
    async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setCreating(true);
      setError(null);

      try {
        const idempotencyKey =
          `frontend-mobility-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

        const response =
          await fetch(
            "/api/mobility/rides",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                "Idempotency-Key":
                  idempotencyKey,
              },
              body: JSON.stringify({
                serviceType,
                currency: "AOA",

                pickupLatitude: 0,
                pickupLongitude: 0,

                dropoffLatitude: 0,
                dropoffLongitude: 0,

                pickupAddress:
                  pickupAddress ||
                  undefined,

                dropoffAddress:
                  dropoffAddress ||
                  undefined,

                safetyMode,
              }),
            },
          );

        const data =
          (await response.json()) as RideResponse;

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to create Mobility ride.",
          );
        }

        setActiveRide(data);
        setSelectedRideId(
          data.ride?.id ?? null,
        );

        await loadOverview();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to create Mobility ride.",
        );
      } finally {
        setCreating(false);
      }
    };

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
    activeRide?.orchestration
      ?.currentStep ??
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
              Every mobility engine.
              <br />
              One operational view.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--theme-text)]/40">
              O frontend está agora ligado ao ciclo operacional real da
              Mobility: safety, pricing, matching, dispatch, lifecycle,
              payment, settlement e financial recovery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-[var(--theme-border)]
                bg-[var(--theme-surface)]
                px-4
                py-2
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.2em]
                text-[color-mix(in_srgb,var(--theme-text)_50%,transparent)]
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--theme-surface-strong)] shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
              Live
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

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--theme-text-faint)]">
              Engine registry
            </p>

            <h2 className="mt-2 text-xl font-medium text-[var(--theme-text)]/85">
              Runtime architecture
            </h2>
          </div>

          <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">
            {ENGINE_REGISTRY.length} engines
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ENGINE_REGISTRY.map(
            (engine) => {
              const connected =
                overview?.engines[
                  engine.key
                ] ?? true;

              return (
                <div
                  key={engine.key}
                  className="
                    rounded-2xl
                    border
                    border-[var(--theme-border)]
                    bg-[var(--theme-surface)]
                    p-5
                    transition
                    hover:border-[var(--theme-border)]
                    hover:bg-[var(--theme-surface)]
                  "
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-faint)]">
                        {engine.layer}
                      </p>

                      <h3 className="mt-2 text-sm font-medium text-[color-mix(in_srgb,var(--theme-text)_75%,transparent)]">
                        {engine.name}
                      </h3>
                    </div>

                    <span
                      className="
                        flex
                        h-7
                        w-7
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-[var(--theme-border)]
                        bg-[var(--theme-surface)]
                      "
                    >
                      <span
                        className={`
                          h-1.5
                          w-1.5
                          rounded-full
                          ${
                            connected
                              ? "bg-[var(--theme-surface-strong)] shadow-[0_0_9px_rgba(255,255,255,0.8)]"
                              : "bg-[var(--theme-surface-strong)]/20"
                          }
                        `}
                      />
                    </span>
                  </div>

                  <p className="mt-4 text-[11px] leading-5 text-[var(--theme-text-muted)]">
                    {engine.description}
                  </p>

                  <p className="mt-4 text-[8px] font-semibold uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">
                    {connected
                      ? "Integrated"
                      : "Unavailable"}
                  </p>
                </div>
              );
            },
          )}
        </div>
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

        <form
          onSubmit={createRide}
          className="
            rounded-[1.75rem]
            border
            border-[var(--theme-border)]
            bg-[var(--theme-surface)]
            p-6
          "
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--theme-text-faint)]">
            Mobility request
          </p>

          <h2 className="mt-2 text-xl font-medium text-[var(--theme-text)]/85">
            Start a real ride lifecycle
          </h2>

          <p className="mt-3 text-xs leading-5 text-[var(--theme-text-muted)]">
            A criação passa pelo Ride Engine e pelo Lifecycle
            Orchestrator. As coordenadas podem ser preenchidas posteriormente
            quando o mapa estiver ligado.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">
                Service type
              </span>

              <select
                value={serviceType}
                onChange={(event) =>
                  setServiceType(
                    event.target.value,
                  )
                }
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-[var(--theme-border)]
                  bg-[var(--theme-background)]/30
                  px-4
                  text-xs
                  text-[var(--theme-text)]
                  outline-none
                "
              >
                <option value="TAXI">
                  TAXI
                </option>

                <option value="MOTO_TAXI">
                  MOTO TAXI
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">
                Safety mode
              </span>

              <select
                value={safetyMode}
                onChange={(event) =>
                  setSafetyMode(
                    event.target
                      .value as MobilitySafetyMode,
                  )
                }
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-[var(--theme-border)]
                  bg-[var(--theme-background)]/30
                  px-4
                  text-xs
                  text-[var(--theme-text)]
                  outline-none
                "
              >
                <option value="STANDARD">
                  STANDARD
                </option>

                <option value="TRUSTED">
                  TRUSTED
                </option>

                <option value="CHILD">
                  CHILD
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">
                Pickup
              </span>

              <input
                value={pickupAddress}
                onChange={(event) =>
                  setPickupAddress(
                    event.target.value,
                  )
                }
                placeholder="Pickup address"
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-[var(--theme-border)]
                  bg-[var(--theme-background)]/30
                  px-4
                  text-xs
                  text-[var(--theme-text)]
                  outline-none
                  placeholder:text-[var(--theme-text-faint)]
                "
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">
                Destination
              </span>

              <input
                value={dropoffAddress}
                onChange={(event) =>
                  setDropoffAddress(
                    event.target.value,
                  )
                }
                placeholder="Destination address"
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-[var(--theme-border)]
                  bg-[var(--theme-background)]/30
                  px-4
                  text-xs
                  text-[var(--theme-text)]
                  outline-none
                  placeholder:text-[var(--theme-text-faint)]
                "
              />
            </label>

            <button
              type="submit"
              disabled={creating}
              className="
                h-12
                w-full
                rounded-full
                bg-[var(--theme-surface-strong)]
                px-6
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-[var(--theme-background)]
                transition
                hover:scale-[1.01]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {creating
                ? "Creating..."
                : "Request Mobility Ride"}
            </button>
          </div>

          {activeRide?.ride && (
            <div
              className="
                mt-5
                rounded-xl
                border
                border-[var(--theme-border)]
                bg-[color-mix(in_srgb,var(--theme-background)_20%,transparent)]
                p-4
              "
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-faint)]">
                  Created
                </span>

                <StatusPill
                  value={
                    activeRide.ride.status
                  }
                />
              </div>

              <p className="mt-3 text-sm text-[var(--theme-text)]">
                {activeRide.ride.reference ??
                  activeRide.ride.id}
              </p>
            </div>
          )}
        </form>
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
