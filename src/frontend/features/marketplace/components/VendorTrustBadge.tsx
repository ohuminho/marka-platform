interface VendorTrustBadgeProps {

  verified?: boolean;

  rating?: number;

}



export default function VendorTrustBadge({

  verified,

  rating,

}: VendorTrustBadgeProps) {


  return (

    <div className="
      flex
      items-center
      gap-3
      text-sm
    ">


      {
        verified
          ?
          <span className="
            rounded-full
            border
            border-white/20
            bg-white/10
            px-3
            py-1
          ">

            Verified Vendor

          </span>

          :

          <span className="
            rounded-full
            border
            border-white/10
            bg-white/5
            px-3
            py-1
            text-white/50
          ">

            Standard Vendor

          </span>
      }



      {
        typeof rating === "number" &&
        (

          <span className="
            text-white/60
          ">

            ★ {rating.toFixed(1)}

          </span>

        )
      }


    </div>

  );

}
