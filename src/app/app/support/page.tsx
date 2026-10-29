import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";
import MobilitySupportCenter from "@/frontend/features/mobility/components/MobilitySupportCenter";

export default function SupportPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <div className="space-y-8">
          <RoleContextSummary />
          <MobilitySupportCenter />
        </div>
      </AppShell>
    </DynamicBackground>
  );
}
