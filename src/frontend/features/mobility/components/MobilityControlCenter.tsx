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

type RideStatus =
  | string;

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
            ? "border-white/15 bg-white/[0.08] text-white/75"
            : warning
              ? "border-white/10 bg-white/[0.04] text-white/50"
              : "border-white/[0.07] bg-black/20 text-white/35"
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
        border-white/[0.07]
        bg-white/[0.025]
        p-5
      "
    >
      <p
        className="
          text-[9px]
          font-semibold
          uppercase
          tracking-[0.25em]
          text-white/25
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
          text-white/90
        "
      >
        {value}
      </p>

      <p className="mt-2 text-[10px] text-white/25">
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
    void loadOverview();

    const interval =
      window.setInterval(
        () => {
          void loadOverview();
        },
        5000,
      );

    return () =>
      window.clearInterval(
        interval,
      );
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
          border-white/[0.08]
          bg-white/[0.025]
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
            bg-white/[0.035]
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
                text-white/30
              "
            >
              <span className="h-px w-8 bg-white/20" />
              Mobility Control Center
            </div>

            <h1
              className="
                mt-6
                text-4xl
                font-semibold
                leading-[0.95]
                tracking-[-0.045em]
                text-white
                sm:text-5xl
              "
            >
              Every mobility engine.
              <br />
              One operational view.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/40">
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
                border-white/10
                bg-white/[0.035]
                px-4
                py-2
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.2em]
                text-white/50
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
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
                border-white/10
                bg-white/[0.035]
                px-4
                py-2
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-white/45
                transition
                hover:border-white/20
                hover:text-white
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
            border-white/10
            bg-white/[0.035]
            px-5
            py-4
            text-xs
            text-white/55
          "
        >
          {error}
        </div>
      )}

      <section>
        <div className="mb-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
            Operational intelligence
          </p>

          <h2 className="mt-2 text-xl font-medium text-white/85">
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
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
              Engine registry
            </p>

            <h2 className="mt-2 text-xl font-medium text-white/85">
              Runtime architecture
            </h2>
          </div>

          <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">
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
                    border-white/[0.07]
                    bg-white/[0.02]
                    p-5
                    transition
                    hover:border-white/[0.14]
                    hover:bg-white/[0.035]
                  "
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/20">
                        {engine.layer}
                      </p>

                      <h3 className="mt-2 text-sm font-medium text-white/75">
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
                        border-white/10
                        bg-white/[0.035]
                      "
                    >
                      <span
                        className={`
                          h-1.5
                          w-1.5
                          rounded-full
                          ${
                            connected
                              ? "bg-white shadow-[0_0_9px_rgba(255,255,255,0.8)]"
                              : "bg-white/20"
                          }
                        `}
                      />
                    </span>
                  </div>

                  <p className="mt-4 text-[11px] leading-5 text-white/30">
                    {engine.description}
                  </p>

                  <p className="mt-4 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/20">
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
            border-white/[0.07]
            bg-white/[0.02]
            p-6
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
                Ride lifecycle
              </p>

              <h2 className="mt-2 text-xl font-medium text-white/85">
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
                            ? "border-white/25 bg-white text-black"
                            : reached
                              ? "border-white/15 bg-white/[0.08] text-white/65"
                              : "border-white/[0.06] bg-white/[0.02] text-white/20"
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
                            ? "bg-white/25"
                            : "bg-white/[0.06]"
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
                            ? "text-white"
                            : reached
                              ? "text-white/55"
                              : "text-white/20"
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
            border-white/[0.07]
            bg-white/[0.02]
            p-6
          "
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
            Mobility request
          </p>

          <h2 className="mt-2 text-xl font-medium text-white/85">
            Start a real ride lifecycle
          </h2>

          <p className="mt-3 text-xs leading-5 text-white/30">
            A criação passa pelo Ride Engine e pelo Lifecycle
            Orchestrator. As coordenadas podem ser preenchidas posteriormente
            quando o mapa estiver ligado.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-white/25">
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
                  border-white/10
                  bg-black/30
                  px-4
                  text-xs
                  text-white
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
              <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-white/25">
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
                  border-white/10
                  bg-black/30
                  px-4
                  text-xs
                  text-white
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
              <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-white/25">
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
                  border-white/10
                  bg-black/30
                  px-4
                  text-xs
                  text-white
                  outline-none
                  placeholder:text-white/20
                "
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-white/25">
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
                  border-white/10
                  bg-black/30
                  px-4
                  text-xs
                  text-white
                  outline-none
                  placeholder:text-white/20
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
                bg-white
                px-6
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-black
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
                border-white/[0.07]
                bg-black/20
                p-4
              "
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                  Created
                </span>

                <StatusPill
                  value={
                    activeRide.ride.status
                  }
                />
              </div>

              <p className="mt-3 text-sm text-white/65">
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
            border-white/[0.07]
            bg-white/[0.02]
            p-6
          "
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
                Recent rides
              </p>

              <h2 className="mt-2 text-xl font-medium text-white/85">
                Mobility activity
              </h2>
            </div>

            <span className="text-[9px] uppercase tracking-[0.18em] text-white/20">
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
                      border-white/[0.05]
                      bg-black/15
                      px-4
                      py-3
                      text-left
                      transition
                      hover:border-white/10
                      hover:bg-white/[0.03]
                    "
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs text-white/65">
                        {ride.reference}
                      </p>

                      <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/20">
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
                        <span className="text-[8px] uppercase tracking-[0.12em] text-white/20">
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
              <p className="py-8 text-center text-xs text-white/20">
                No Mobility rides yet.
              </p>
            )}
          </div>
        </div>

        <div
          className="
            rounded-[1.75rem]
            border
            border-white/[0.07]
            bg-white/[0.02]
            p-6
          "
        >
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
              Orchestration events
            </p>

            <h2 className="mt-2 text-xl font-medium text-white/85">
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
                      border-white/[0.05]
                      bg-black/15
                      px-4
                      py-3
                    "
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-white/55">
                        {event.action}
                      </p>

                      <StatusPill
                        value={
                          event.status
                        }
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-white/20">
                        {formatStep(
                          event.fromStep,
                        )}{" "}
                        →{" "}
                        {formatStep(
                          event.toStep,
                        )}
                      </p>

                      <p className="text-[9px] text-white/15">
                        {formatDate(
                          event.createdAt,
                        )}
                      </p>
                    </div>
                  </div>
                ),
              )
            ) : (
              <p className="py-8 text-center text-xs text-white/20">
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
          border-white/[0.07]
          bg-white/[0.02]
          p-6
        "
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
              Financial layer
            </p>

            <h2 className="mt-2 text-xl font-medium text-white/85">
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
          <div className="rounded-xl border border-white/[0.05] bg-black/15 p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/20">
              Payment
            </p>
            <p className="mt-2 text-sm text-white/65">
              {
                overview?.metrics.payments
                  .collected ?? 0
              }{" "}
              collected
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.05] bg-black/15 p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/20">
              Settlement
            </p>
            <p className="mt-2 text-sm text-white/65">
              {
                overview?.metrics.settlements
                  .completed ?? 0
              }{" "}
              completed
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.05] bg-black/15 p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/20">
              Cash obligation
            </p>
            <p className="mt-2 text-sm text-white/65">
              Financial obligation
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.05] bg-black/15 p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/20">
              Recovery
            </p>
            <p className="mt-2 text-sm text-white/65">
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
              border-white/10
              bg-white/[0.035]
              px-5
              text-[9px]
              font-semibold
              uppercase
              tracking-[0.18em]
              text-white/55
              transition
              hover:border-white/20
              hover:text-white
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
