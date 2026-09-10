"use client";


interface MarketplaceFiltersProps {

  verifiedOnly: boolean;

  onVerifiedChange: (
    value: boolean
  ) => void;


  sortBy: string;

  onSortChange: (
    value: string
  ) => void;

}



export default function MarketplaceFilters({

  verifiedOnly,

  onVerifiedChange,

  sortBy,

  onSortChange,

}: MarketplaceFiltersProps) {


  return (

    <div className="
      mt-6
      flex
      flex-wrap
      gap-4
      items-center
    ">


      <label className="
        flex
        items-center
        gap-3
        rounded-xl
        border
        border-white/10
        bg-white/5
        px-4
        py-3
      ">


        <input

          type="checkbox"

          checked={
            verifiedOnly
          }

          onChange={(event) =>
            onVerifiedChange(
              event.target.checked
            )
          }

        />


        <span>

          Verified Vendors

        </span>


      </label>



      <select

        value={
          sortBy
        }

        onChange={(event) =>
          onSortChange(
            event.target.value
          )
        }

        className="
          rounded-xl
          border
          border-white/10
          bg-white/5
          px-4
          py-3
          outline-none
        "

      >

        <option value="latest">

          Latest

        </option>


        <option value="price_asc">

          Price: Low to High

        </option>


        <option value="price_desc">

          Price: High to Low

        </option>


      </select>


    </div>

  );

}
