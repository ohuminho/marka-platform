import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="
      flex
      min-h-screen
    ">
      <Sidebar />

      <div className="
        flex-1
      ">
        <TopNav />

        <main className="p-8">
          {children}
        </main>

      </div>

    </div>
  );
}
