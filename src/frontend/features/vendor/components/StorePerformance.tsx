"use client";

import GlassCard from "@/design-system/components/cards/GlassCard";

import {
  useVendorIntelligence,
} from "../context/VendorIntelligenceProvider";


export default function StorePerformance() {


  const {
    intelligence,
    loading,
  } =
    useVendorIntelligence();



  return (

    <GlassCard className="p-8">


      <h3 className="text-2xl font-semibold">

        Store Performance

      </h3>



      <p className="
        mt-3
        text-white/50
      ">

        Digital storefront health and business status.

      </p>



      <div className="
        mt-8
        space-y-4
      ">


        <div className="
          flex
          justify-between
          text-sm
        ">

          <span className="text-white/50">

            Store

          </span>


          <span>

            {
              loading
                ? "..."
                :
                intelligence?.store.name ?? "N/A"
            }

          </span>

        </div>



        <div className="
          flex
          justify-between
          text-sm
        ">

          <span className="text-white/50">

            Verification

          </span>


          <span>

            {
              loading
                ? "..."
                :
                intelligence?.store.verified
                  ? "Verified"
                  : "Pending"
            }

          </span>

        </div>



        <div className="
          flex
          justify-between
          text-sm
        ">

          <span className="text-white/50">

            Status

          </span>


          <span>

            {
              loading
                ? "..."
                :
                intelligence?.status ?? "Unknown"
            }

          </span>

        </div>



      </div>


    </GlassCard>

  );

}
