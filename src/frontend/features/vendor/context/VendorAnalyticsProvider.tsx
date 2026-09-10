"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import {
  useVendor,
} from "./VendorProvider";

import {
  getVendorAnalytics,
} from "../services/vendor.analytics.client";


interface VendorAnalytics {

  revenue: {

    current: number;

    previous: number;

    growthPercentage: number;

    currency: string;

  };

  sales: {

    totalOrders: number;

    completedOrders: number;

    cancelledOrders: number;

    averageOrderValue: number;

  };

}



interface VendorAnalyticsContextType {

  analytics?: VendorAnalytics;

  loading: boolean;

  refreshAnalytics: () => Promise<void>;

}



const VendorAnalyticsContext =
  createContext<VendorAnalyticsContextType>({

    loading: true,

    refreshAnalytics: async () => {},

  });



export function VendorAnalyticsProvider({
  children,
}: {
  children: ReactNode;
}) {


  const {
    vendor,
  } = useVendor();


  const [analytics, setAnalytics] =
    useState<VendorAnalytics>();


  const [loading, setLoading] =
    useState(true);



  async function refreshAnalytics() {

    if (!vendor?.id) {
      return;
    }


    try {

      const data =
        await getVendorAnalytics(
          vendor.id
        );


      setAnalytics(
        data
      );


    } finally {

      setLoading(false);

    }

  }



  useEffect(() => {

    refreshAnalytics();

  }, [vendor?.id]);



  return (

    <VendorAnalyticsContext.Provider

      value={{

        analytics,

        loading,

        refreshAnalytics,

      }}

    >

      {children}

    </VendorAnalyticsContext.Provider>

  );

}



export function useVendorAnalytics() {

  return useContext(
    VendorAnalyticsContext
  );

}
