import PremiumCard from "@/design-system/components/cards/PremiumCard";
import MetricDisplay from "@/design-system/components/data-display/MetricDisplay";
import FadeIn from "@/design-system/motion/FadeIn";

export default function ExecutiveDashboard() {
  return (
    <FadeIn>

      <div className="space-y-8">

        <header>
          <h1 className="text-5xl font-semibold">
            MARKA Command Center
          </h1>

          <p className="text-neutral-400 mt-2">
            African born. Globally built.
          </p>
        </header>


        <section className="
          grid
          grid-cols-1
          md:grid-cols-4
          gap-6
        ">

          <FadeIn>
            <PremiumCard>
              <MetricDisplay
                label="Active Users"
                value="0"
              />
            </PremiumCard>
          </FadeIn>


          <FadeIn>
            <PremiumCard>
              <MetricDisplay
                label="Transactions"
                value="0"
              />
            </PremiumCard>
          </FadeIn>


          <FadeIn>
            <PremiumCard>
              <MetricDisplay
                label="Revenue"
                value="AOA 0"
              />
            </PremiumCard>
          </FadeIn>


          <FadeIn>
            <PremiumCard>
              <MetricDisplay
                label="Markets"
                value="1"
              />
            </PremiumCard>
          </FadeIn>

        </section>

      </div>

    </FadeIn>
  );
}
