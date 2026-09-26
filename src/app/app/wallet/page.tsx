import WalletDashboard from "@/frontend/features/wallet/components/WalletDashboard";
import PaymentHistory from "@/frontend/features/wallet/components/PaymentHistory";

export default function WalletPage() {
  return (
    <main className="space-y-10">
      <WalletDashboard />
      <PaymentHistory />
    </main>
  );
}
