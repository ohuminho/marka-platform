import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import MobilityControlCenter from "@/frontend/features/mobility/components/MobilityControlCenter";

export default function MobilityPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <MobilityControlCenter />
      </AppShell>
    </DynamicBackground>
  );
}
