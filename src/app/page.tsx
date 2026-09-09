import Sidebar from "@/components/dashboard/Sidebar";
import MetricCard from "@/components/dashboard/MetricCard";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-black text-white">
      <Sidebar />

      <section className="flex-1 p-10">
        <h1 className="text-4xl font-bold mb-8">
          MARKA Command Center
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Users"
            value="0"
          />

          <MetricCard
            title="Vendors"
            value="0"
          />

          <MetricCard
            title="Revenue"
            value="$0"
          />
        </div>
      </section>
    </main>
  );
}
