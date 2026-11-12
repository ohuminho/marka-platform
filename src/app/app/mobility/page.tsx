import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import MobilityExperience from "@/frontend/features/mobility/components/MobilityExperience";
import MobilityActiveTripExperience from "@/frontend/features/mobility/components/MobilityActiveTripExperience";
import MobilityFreightCustomerQuotes from "@/frontend/features/mobility/components/MobilityFreightCustomerQuotes";

export default function MobilityPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-5">
          <MobilityExperience />
          <MobilityActiveTripExperience audience="rider" />
          <MobilityFreightCustomerQuotes />
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
