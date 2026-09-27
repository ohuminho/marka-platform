import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import DeliveryAgentOffers from "@/frontend/features/delivery/components/DeliveryAgentOffers";

export default function DeliveryAgentOffersPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <DeliveryAgentOffers />
      </AppShell>
    </DynamicBackground>
  );
}
