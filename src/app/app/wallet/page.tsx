import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import WalletDashboard from "@/frontend/features/wallet/components/WalletDashboard";


export default function WalletPage() {

  return (

    <DynamicBackground>

      <AppShell>

        <WalletDashboard />

      </AppShell>

    </DynamicBackground>

  );

}
