import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import DeliveryAgentManagement from "@/frontend/features/delivery/components/DeliveryAgentManagement";

export default function DeliveryAgentsPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <DeliveryAgentManagement />
      </AppShell>
    </DynamicBackground>
  );
}
