"use client";


import {
  useState,
  useEffect,
} from "react";



interface MarketplaceSearchProps {

  onSearch: (
    value: string
  ) => void;

}



export default function MarketplaceSearch({

  onSearch,

}: MarketplaceSearchProps) {


  const [
    value,
    setValue
  ] =
    useState("");



  useEffect(() => {


    const timer =
      setTimeout(() => {

        onSearch(
          value
        );


      }, 500);



    return () => {

      clearTimeout(
        timer
      );

    };


  }, [
    value,
    onSearch,
  ]);



  return (

    <div className="
      w-full
      max-w-2xl
    ">


      <input

        value={value}

        onChange={(event) =>
          setValue(
            event.target.value
          )
        }

        placeholder="
          Search products, stores and categories...
        "

        className="
          w-full
          rounded-2xl
          border
          border-white/10
          bg-white/5
          px-6
          py-4
          text-lg
          outline-none
          backdrop-blur-xl
          placeholder:text-white/40
        "

      />


    </div>

  );

}
