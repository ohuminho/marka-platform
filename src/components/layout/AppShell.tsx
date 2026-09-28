import React from "react";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--theme-background)] text-[var(--theme-text)]">
      {children}
    </div>
  );
}
