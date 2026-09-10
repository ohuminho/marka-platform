import {
  ReactNode,
} from "react";


export default function PremiumCard({

  children,

  className = "",

}: {

  children: ReactNode;

  className?: string;

}) {


  return (

    <section
      className={`
        rounded-3xl
        border
        border-white/10
        bg-white/5
        backdrop-blur-2xl
        shadow-2xl
        p-8
        ${className}
      `}
    >

      {children}

    </section>

  );

}
