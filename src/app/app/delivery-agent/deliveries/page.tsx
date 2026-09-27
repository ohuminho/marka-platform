import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import DeliveryAgentDeliveries from "@/frontend/features/delivery/components/DeliveryAgentDeliveries";

export default function DeliveryAgentDeliveriesPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <DeliveryAgentDeliveries />
      </AppShell>
    </DynamicBackground>
  );
}
