"use client";

import { AuthProvider } from "./auth/AuthProvider";


export default function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );

}
