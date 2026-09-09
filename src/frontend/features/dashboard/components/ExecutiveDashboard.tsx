import PremiumCard from "@/design-system/components/cards/PremiumCard";
import MetricDisplay from "@/design-system/components/data-display/MetricDisplay";

export default function ExecutiveDashboard() {
  return (
    <div className="space-y-8">

      <header>
        <h1 className="text-5xl font-semibold">
          MARKA Command Center
        </h1>

        <p className="text-neutral-400">
          Global commerce intelligence platform
        </p>
      </header>

      <section className="
        grid
        grid-cols-1
        md:grid-cols-4
        gap-6
      ">

        <PremiumCard>
          <MetricDisplay
            label="Active Users"
            value="0"
          />
        </PremiumCard>

        <PremiumCard>
          <MetricDisplay
            label="Transactions"
            value="0"
          />
        </PremiumCard>

        <PremiumCard>
          <MetricDisplay
            label="Revenue"
            value="AOA 0"
          />
        </PremiumCard>

        <PremiumCard>
          <MetricDisplay
            label="Markets"
            value="1"
          />
        </PremiumCard>

      </section>

    </div>
  );
}
