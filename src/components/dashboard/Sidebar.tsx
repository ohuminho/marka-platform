export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-neutral-900 p-6">
      <h2 className="text-xl font-bold mb-8">
        MARKA
      </h2>

      <nav className="space-y-4 text-neutral-300">
        <div>Dashboard</div>
        <div>Marketplace</div>
        <div>Wallet</div>
        <div>Vendors</div>
        <div>Analytics</div>
      </nav>
    </aside>
  );
}
