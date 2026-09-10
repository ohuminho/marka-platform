"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { useVendor } from "./VendorProvider";

import {
  getVendorIntelligence,
} from "../services/vendor.intelligence.client";


interface VendorIntelligence {


  store: {

    name?: string;

    rating?: number;

    verified?: boolean;

  };


  catalogue: {

    totalProducts: number;

    activeProducts: number;

  };


  inventory: {

    units: number;

    estimatedValue: number;

  };


  status: string;


}



interface VendorIntelligenceContextType {

  intelligence?: VendorIntelligence;

  loading: boolean;

  refresh: () => Promise<void>;

}



const VendorIntelligenceContext =
  createContext<VendorIntelligenceContextType>({

    loading: true,

    refresh: async () => {},

  });



export function VendorIntelligenceProvider({

  children,

}: {

  children: ReactNode;

}) {


  const {
    vendor,
  } = useVendor();



  const [
    intelligence,
    setIntelligence
  ] =
    useState<VendorIntelligence>();



  const [
    loading,
    setLoading
  ] =
    useState(true);



  async function refresh() {


    if (!vendor?.id) {

      setLoading(false);

      return;

    }



    try {


      const data =
        await getVendorIntelligence(
          vendor.id
        );


      setIntelligence(
        data
      );


    } finally {

      setLoading(false);

    }


  }



  useEffect(() => {

    refresh();

  }, [vendor?.id]);



  return (

    <VendorIntelligenceContext.Provider

      value={{

        intelligence,

        loading,

        refresh,

      }}

    >

      {children}

    </VendorIntelligenceContext.Provider>

  );

}



export function useVendorIntelligence() {

  return useContext(
    VendorIntelligenceContext
  );

}
