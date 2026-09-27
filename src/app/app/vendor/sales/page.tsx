import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import VendorSales from "@/frontend/features/vendor/components/VendorSales";

export default function VendorSalesPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <VendorSales />
      </AppShell>
    </DynamicBackground>
  );
}
