import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import MobilityControlCenter from "@/frontend/features/mobility/components/MobilityControlCenter";
import MobilityExperience from "@/frontend/features/mobility/components/MobilityExperience";
import MobilityActiveTripExperience from "@/frontend/features/mobility/components/MobilityActiveTripExperience";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

export default function MobilityPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <div className="space-y-8">
          <RoleContextSummary />
          <MobilityActiveTripExperience audience="rider" />
          <MobilityExperience />
          <MobilityControlCenter />
        </div>
      </AppShell>
    </DynamicBackground>
  );
}
