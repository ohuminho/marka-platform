"use client";

import { AuthProvider } from "./auth/AuthProvider";

import {
  VendorProvider,
} from "@/frontend/features/vendor/context/VendorProvider";

import {
  VendorAnalyticsProvider,
} from "@/frontend/features/vendor/context/VendorAnalyticsProvider";


export default function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <AuthProvider>

      <VendorProvider>

        <VendorAnalyticsProvider>

          {children}

        </VendorAnalyticsProvider>

      </VendorProvider>

    </AuthProvider>

  );

}
