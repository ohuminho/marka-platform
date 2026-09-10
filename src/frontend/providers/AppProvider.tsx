"use client";

import { AuthProvider } from "./auth/AuthProvider";

import {
  VendorProvider,
} from "@/frontend/features/vendor/context/VendorProvider";

import {
  VendorIntelligenceProvider,
} from "@/frontend/features/vendor/context/VendorIntelligenceProvider";


export default function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <AuthProvider>

      <VendorProvider>

        <VendorIntelligenceProvider>

          {children}

        </VendorIntelligenceProvider>

      </VendorProvider>

    </AuthProvider>

  );

}
