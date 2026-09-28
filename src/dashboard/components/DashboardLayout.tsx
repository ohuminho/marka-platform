import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--theme-background)] text-[var(--theme-text)] p-8">
      {children}
    </div>
  );
}
