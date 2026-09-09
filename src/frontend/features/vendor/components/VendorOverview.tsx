import RevenuePulse from "./RevenuePulse";
import InventoryHealth from "./InventoryHealth";
import StorePerformance from "./StorePerformance";


export default function VendorOverview() {

  return (

    <div className="space-y-10">


      <header>

        <h1 className="
          text-5xl
          font-semibold
        ">
          Vendor Command Center
        </h1>


        <p className="
          mt-3
          text-white/50
        ">
          Your business intelligence workspace.
        </p>

      </header>



      <RevenuePulse />


      <div className="
        grid
        lg:grid-cols-2
        gap-8
      ">

        <InventoryHealth />

        <StorePerformance />

      </div>


    </div>

  );

}
