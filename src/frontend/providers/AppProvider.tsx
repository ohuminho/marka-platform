"use client";

import { PlatformPreferencesProvider } from "./preferences/PlatformPreferencesProvider";
import { AuthProvider } from "./auth/AuthProvider";
import { VendorProvider } from "@/frontend/features/vendor/context/VendorProvider";
import { VendorAnalyticsProvider } from "@/frontend/features/vendor/context/VendorAnalyticsProvider";

export default function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <PlatformPreferencesProvider>
      <AuthProvider>
        <VendorProvider>
          <VendorAnalyticsProvider>{children}</VendorAnalyticsProvider>
        </VendorProvider>
      </AuthProvider>
    </PlatformPreferencesProvider>
  );
}
