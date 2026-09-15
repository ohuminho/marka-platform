// FILE: /workspaces/marka-platform/src/frontend/features/landing/components/MarkaHero.tsx

"use client";

import Link from "next/link";
import FadeIn from "@/design-system/motion/FadeIn";

export default function MarkaHero() {
  return (
    <FadeIn>
      <main
        className="
          relative
          flex
          min-h-screen
          items-center
          justify-center
          overflow-hidden
          px-6
          py-20
        "
      >
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            left-1/2
            top-1/2
            h-[620px]
            w-[620px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-white/[0.035]
            blur-[120px]
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            left-1/2
            top-1/2
            h-[420px]
            w-[420px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            border
            border-white/[0.055]
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            left-1/2
            top-1/2
            h-[700px]
            w-[700px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            border
            border-white/[0.025]
          "
        />

        <section
          className="
            relative
            z-10
            flex
            w-full
            max-w-6xl
            flex-col
            items-center
            text-center
          "
        >
          <div
            className="
              mb-8
              flex
              items-center
              gap-3
              text-[10px]
              font-medium
              uppercase
              tracking-[0.42em]
              text-white/35
            "
          >
            <span className="h-px w-10 bg-white/15" />
            <span>Global Digital Economy</span>
            <span className="h-px w-10 bg-white/15" />
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="
                absolute
                inset-x-0
                bottom-1
                h-8
                bg-white/10
                blur-3xl
              "
            />

            <h1
              className="
                relative
                select-none
                bg-gradient-to-b
                from-white
                via-neutral-300
                to-neutral-600
                bg-clip-text
                text-[clamp(5rem,17vw,13rem)]
                font-semibold
                leading-[0.78]
                tracking-[-0.075em]
                text-transparent
                drop-shadow-[0_18px_45px_rgba(255,255,255,0.08)]
              "
            >
              MARKA
            </h1>
          </div>

          <div
            className="
              mt-10
              max-w-3xl
            "
          >
            <h2
              className="
                text-balance
                text-2xl
                font-light
                tracking-[-0.025em]
                text-white/85
                sm:text-3xl
                lg:text-4xl
              "
            >
              The infrastructure of a new digital economy.
            </h2>

            <p
              className="
                mx-auto
                mt-6
                max-w-2xl
                text-sm
                leading-7
                text-white/40
                sm:text-base
                sm:leading-8
              "
            >
              Commerce, payments, mobility, business and opportunity —
              brought together in one intelligent global platform.
            </p>
          </div>

          <div
            className="
              mt-12
              flex
              flex-col
              items-center
              gap-4
              sm:flex-row
            "
          >
            <Link
              href="/app"
              className="
                group
                relative
                inline-flex
                h-14
                min-w-52
                items-center
                justify-center
                overflow-hidden
                rounded-full
                border
                border-white/20
                bg-white
                px-8
                text-sm
                font-semibold
                tracking-wide
                text-black
                shadow-[0_20px_60px_rgba(255,255,255,0.08)]
                transition-all
                duration-500
                hover:scale-[1.025]
                hover:shadow-[0_24px_80px_rgba(255,255,255,0.14)]
              "
            >
              <span
                className="
                  absolute
                  inset-0
                  -translate-x-full
                  bg-gradient-to-r
                  from-transparent
                  via-black/10
                  to-transparent
                  transition-transform
                  duration-700
                  group-hover:translate-x-full
                "
              />

              <span className="relative">
                Enter MARKA
              </span>

              <span
                className="
                  relative
                  ml-3
                  transition-transform
                  duration-300
                  group-hover:translate-x-1
                "
              >
                →
              </span>
            </Link>

            <Link
              href="/app/marketplace"
              className="
                inline-flex
                h-14
                min-w-52
                items-center
                justify-center
                rounded-full
                border
                border-white/[0.12]
                bg-white/[0.025]
                px-8
                text-sm
                font-medium
                tracking-wide
                text-white/75
                backdrop-blur-xl
                transition-all
                duration-300
                hover:border-white/25
                hover:bg-white/[0.06]
                hover:text-white
              "
            >
              Explore the ecosystem
            </Link>
          </div>

          <div
            className="
              mt-16
              grid
              grid-cols-1
              overflow-hidden
              rounded-2xl
              border
              border-white/[0.07]
              bg-white/[0.02]
              backdrop-blur-xl
              sm:grid-cols-3
            "
          >
            {[
              ["COMMERCE", "Global marketplace"],
              ["PAYMENTS", "Financial infrastructure"],
              ["MOBILITY", "Movement without borders"],
            ].map(([title, description], index) => (
              <div
                key={title}
                className={`
                  min-w-52
                  px-8
                  py-6
                  text-left
                  ${
                    index > 0
                      ? "border-t border-white/[0.07] sm:border-l sm:border-t-0"
                      : ""
                  }
                `}
              >
                <p
                  className="
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.25em]
                    text-white/35
                  "
                >
                  {title}
                </p>

                <p
                  className="
                    mt-2
                    text-xs
                    text-white/55
                  "
                >
                  {description}
                </p>
              </div>
            ))}
          </div>

          <p
            className="
              mt-10
              text-[9px]
              uppercase
              tracking-[0.35em]
              text-white/20
            "
          >
            African born · Globally built
          </p>
        </section>
      </main>
    </FadeIn>
  );
}
