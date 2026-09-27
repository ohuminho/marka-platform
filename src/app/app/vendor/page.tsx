import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import VendorOverview from "@/frontend/features/vendor/components/VendorOverview";
import { VendorProvider } from "@/frontend/features/vendor/context/VendorProvider";

export default function VendorPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <VendorProvider>
          <VendorOverview />
        </VendorProvider>
      </AppShell>
    </DynamicBackground>
  );
}
