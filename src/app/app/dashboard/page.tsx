import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import ExecutiveDashboard from "@/frontend/features/dashboard/components/ExecutiveDashboard";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

export default function DashboardPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <div className="space-y-8">
          <RoleContextSummary />
          <ExecutiveDashboard />
        </div>
      </AppShell>
    </DynamicBackground>
  );
}
