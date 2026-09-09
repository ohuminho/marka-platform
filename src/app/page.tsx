import Sidebar from "@/components/dashboard/Sidebar";
import Card from "@/design-system/components/Card";
import Button from "@/design-system/components/Button";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-black text-white">
      <Sidebar />

      <section className="flex-1 p-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold">
              MARKA Command Center
            </h1>

            <p className="text-neutral-400 mt-2">
              Global commerce operating system
            </p>
          </div>

          <Button>
            Create Business
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <p className="text-neutral-400">
              Users
            </p>
            <h2 className="text-4xl font-bold mt-3">
              0
            </h2>
          </Card>

          <Card>
            <p className="text-neutral-400">
              Vendors
            </p>
            <h2 className="text-4xl font-bold mt-3">
              0
            </h2>
          </Card>

          <Card>
            <p className="text-neutral-400">
              Revenue
            </p>
            <h2 className="text-4xl font-bold mt-3">
              $0
            </h2>
          </Card>
        </div>
      </section>
    </main>
  );
}
