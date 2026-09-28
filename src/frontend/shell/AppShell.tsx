"use client";

import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--theme-background)] text-[var(--theme-text)] transition-colors duration-200">
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          fixed
          inset-0
          z-0
          bg-[radial-gradient(circle_at_70%_10%,color-mix(in_srgb,var(--theme-accent)_18%,transparent),transparent_30%),radial-gradient(circle_at_20%_80%,color-mix(in_srgb,var(--theme-accent)_8%,transparent),transparent_32%)]
        "
      />

      <div className="relative z-10 flex min-h-screen">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <TopNav />

          <main
            className="
              relative
              min-h-[calc(100vh-6rem)] bg-transparent
              px-5
              py-6
              sm:px-7
              lg:px-10
              lg:py-8
            "
          >
            <div className="mx-auto w-full max-w-[1800px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
