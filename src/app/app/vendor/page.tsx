import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import VendorOverview from "@/frontend/features/vendor/components/VendorOverview";


export default function VendorPage() {

  return (

    <DynamicBackground>

      <AppShell>

        <VendorOverview />

      </AppShell>

    </DynamicBackground>

  );

}
