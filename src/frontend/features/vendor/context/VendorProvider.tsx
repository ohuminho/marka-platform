"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { getCurrentVendor } from "../services/vendor.client";


interface Vendor {

  id: string;

  name: string;

  store?: {

    id: string;

    name: string;

  };

}



interface VendorContextType {

  vendor?: Vendor;

  loading: boolean;

  refreshVendor: () => Promise<void>;

}



const VendorContext =
  createContext<VendorContextType>({

    loading: true,

    refreshVendor: async () => {},

  });



export function VendorProvider({
  children,
}: {
  children: ReactNode;
}) {


  const [vendor, setVendor] =
    useState<Vendor>();


  const [loading, setLoading] =
    useState(true);



  async function refreshVendor() {

    try {

      const data =
        await getCurrentVendor();


      setVendor(
        data.vendor
      );


    } catch {

      setVendor(
        undefined
      );

    } finally {

      setLoading(false);

    }

  }



  useEffect(() => {

    refreshVendor();

  }, []);



  return (

    <VendorContext.Provider

      value={{

        vendor,

        loading,

        refreshVendor,

      }}

    >

      {children}

    </VendorContext.Provider>

  );

}



export function useVendor() {

  return useContext(
    VendorContext
  );

}
