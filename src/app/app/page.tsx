import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import ExecutiveDashboard from "@/frontend/features/dashboard/components/ExecutiveDashboard";

export default function AppHome() {
  return (
    <DynamicBackground>
      <AppShell>
        <ExecutiveDashboard />
      </AppShell>
    </DynamicBackground>
  );
}
