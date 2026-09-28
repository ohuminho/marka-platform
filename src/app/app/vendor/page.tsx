import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import VendorOverview from "@/frontend/features/vendor/components/VendorOverview";
import { VendorProvider } from "@/frontend/features/vendor/context/VendorProvider";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

export default function VendorPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <VendorProvider>
          <main className="space-y-6">
            <RoleContextSummary />
            <VendorOverview />
          </main>
        </VendorProvider>
      </AppShell>
    </DynamicBackground>
  );
}
