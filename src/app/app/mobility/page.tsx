import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import MobilityExperience from "@/frontend/features/mobility/components/MobilityExperience";
import MobilityActiveTripExperience from "@/frontend/features/mobility/components/MobilityActiveTripExperience";
import MobilityFreightCustomerQuotes from "@/frontend/features/mobility/components/MobilityFreightCustomerQuotes";
import MobilityFreightRequestForm from "@/frontend/features/mobility/components/MobilityFreightRequestForm";

export default function MobilityPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-5">
          <MobilityExperience />
          <MobilityActiveTripExperience audience="rider" />
          <MobilityFreightRequestForm />
          <MobilityFreightCustomerQuotes />
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
