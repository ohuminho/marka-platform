import { ReactNode } from "react";


interface GlassCardProps {

  children: ReactNode;

  className?: string;

}


export default function GlassCard({

  children,

  className = "",

}: GlassCardProps) {


  return (

    <div

      className={`
        rounded-[32px]
        border
        border-white/10
        bg-white/[0.08]
        backdrop-blur-2xl
        shadow-2xl
        transition-all
        duration-500
        hover:border-white/20
        ${className}
      `}

    >

      {children}

    </div>

  );

}
