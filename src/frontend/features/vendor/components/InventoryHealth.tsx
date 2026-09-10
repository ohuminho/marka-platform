"use client";

import GlassCard from "@/design-system/components/cards/GlassCard";

import {
  useVendorIntelligence,
} from "../context/VendorIntelligenceProvider";


export default function InventoryHealth() {


  const {
    intelligence,
    loading,
  } =
    useVendorIntelligence();



  return (

    <GlassCard className="p-8">


      <h3 className="text-2xl font-semibold">

        Inventory Intelligence

      </h3>



      <p className="
        mt-3
        text-white/50
      ">

        Real-time stock and catalogue health.

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

            Total Products

          </span>


          <span>

            {
              loading
                ? "..."
                :
                intelligence?.catalogue.totalProducts ?? 0
            }

          </span>

        </div>



        <div className="
          flex
          justify-between
          text-sm
        ">

          <span className="text-white/50">

            Active Products

          </span>


          <span>

            {
              loading
                ? "..."
                :
                intelligence?.catalogue.activeProducts ?? 0
            }

          </span>

        </div>



        <div className="
          flex
          justify-between
          text-sm
        ">

          <span className="text-white/50">

            Stock Units

          </span>


          <span>

            {
              loading
                ? "..."
                :
                intelligence?.inventory.units ?? 0
            }

          </span>

        </div>



      </div>


    </GlassCard>

  );

}
