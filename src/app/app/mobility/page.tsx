import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import MobilityControlCenter from "@/frontend/features/mobility/components/MobilityControlCenter";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

export default function MobilityPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <div className="space-y-6">
          <RoleContextSummary />
          <MobilityControlCenter />
        </div>
      </AppShell>
    </DynamicBackground>
  );
}
