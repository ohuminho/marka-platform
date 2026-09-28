import WalletDashboard from "@/frontend/features/wallet/components/WalletDashboard";
import PaymentHistory from "@/frontend/features/wallet/components/PaymentHistory";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

export default function WalletPage() {
  return (
    <main className="space-y-8">
      <RoleContextSummary />
      <WalletDashboard />
      <PaymentHistory />
    </main>
  );
}
