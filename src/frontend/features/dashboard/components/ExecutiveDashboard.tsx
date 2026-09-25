"use client";

import Link from "next/link";
import PremiumCard from "@/design-system/components/cards/PremiumCard";
import MetricDisplay from "@/design-system/components/data-display/MetricDisplay";
import FadeIn from "@/design-system/motion/FadeIn";

const ecosystem = [
  {
    title: "Marketplace",
    description: "Commerce and discovery",
    route: "/app/marketplace",
    index: "01",
  },
  {
    title: "Wallet",
    description: "Digital financial infrastructure",
    route: "/app/wallet",
    index: "02",
  },
  {
    title: "Mobility",
    description: "Rides, safety, dispatch and financial orchestration",
    route: "/app/mobility",
    index: "03",
  },
  {
    title: "Business",
    description: "Enterprise and merchant tools",
    route: "/app/vendor",
    index: "04",
  },
];

export default function ExecutiveDashboard() {
  return (
    <FadeIn>
      <div className="space-y-10">
        <section
          className="
            relative
            overflow-hidden
            rounded-[2rem]
            border
            border-white/[0.08]
            bg-white/[0.025]
            px-6
            py-8
            shadow-[0_30px_100px_rgba(0,0,0,0.25)]
            sm:px-9
            sm:py-10
            lg:px-12
            lg:py-12
          "
        >
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -right-32
              -top-40
              h-96
              w-96
              rounded-full
              bg-white/[0.035]
              blur-[100px]
            "
          />

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              bottom-0
              left-1/3
              h-px
              w-1/2
              bg-gradient-to-r
              from-transparent
              via-white/10
              to-transparent
            "
          />

          <div className="relative max-w-4xl">
            <div
              className="
                flex
                items-center
                gap-3
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.32em]
                text-white/30
              "
            >
              <span className="h-px w-8 bg-white/20" />
              MARKA Command Center
            </div>

            <h1
              className="
                mt-6
                text-balance
                bg-gradient-to-b
                from-white
                via-neutral-200
                to-neutral-500
                bg-clip-text
                text-4xl
                font-semibold
                leading-[0.95]
                tracking-[-0.045em]
                text-transparent
                sm:text-5xl
                lg:text-6xl
              "
            >
              One platform.
              <br />
              Infinite possibilities.
            </h1>

            <p
              className="
                mt-6
                max-w-2xl
                text-sm
                leading-7
                text-white/40
                sm:text-base
                sm:leading-8
              "
            >
              Your central view into the MARKA ecosystem — commerce,
              financial infrastructure, mobility and business.
            </p>
          </div>

          <div
            className="
              relative
              mt-10
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
            "
          >
            <Link
              href="/app/mobility"
              className="
                inline-flex
                h-12
                items-center
                justify-center
                rounded-full
                border
                border-white/15
                bg-white
                px-7
                text-xs
                font-semibold
                tracking-wide
                text-black
                transition-all
                duration-300
                hover:scale-[1.02]
                hover:shadow-[0_15px_45px_rgba(255,255,255,0.1)]
              "
            >
              Open Mobility
              <span className="ml-3">→</span>
            </Link>

            <div
              className="
                flex
                h-12
                items-center
                gap-3
                rounded-full
                border
                border-white/[0.08]
                bg-black/20
                px-5
              "
            >
              <span
                className="
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-white
                  shadow-[0_0_10px_rgba(255,255,255,0.8)]
                "
              />

              <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Platform operational
              </span>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p
                className="
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-[0.3em]
                  text-white/25
                "
              >
                Platform intelligence
              </p>

              <h2
                className="
                  mt-2
                  text-xl
                  font-medium
                  tracking-[-0.02em]
                  text-white/85
                "
              >
                At a glance
              </h2>
            </div>

            <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/20 sm:block">
              Live platform metrics
            </span>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
              xl:grid-cols-4
            "
          >
            <FadeIn>
              <PremiumCard>
                <MetricDisplay
                  label="Active Users"
                  value="0"
                />
              </PremiumCard>
            </FadeIn>

            <FadeIn>
              <PremiumCard>
                <MetricDisplay
                  label="Transactions"
                  value="0"
                />
              </PremiumCard>
            </FadeIn>

            <FadeIn>
              <PremiumCard>
                <MetricDisplay
                  label="Revenue"
                  value="AOA 0"
                />
              </PremiumCard>
            </FadeIn>

            <FadeIn>
              <PremiumCard>
                <MetricDisplay
                  label="Markets"
                  value="1"
                />
              </PremiumCard>
            </FadeIn>
          </div>
        </section>

        <section>
          <div className="mb-5">
            <p
              className="
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.3em]
                text-white/25
              "
            >
              MARKA ecosystem
            </p>

            <h2
              className="
                mt-2
                text-xl
                font-medium
                tracking-[-0.02em]
                text-white/85
              "
            >
              Enter an experience
            </h2>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-3
              md:grid-cols-2
            "
          >
            {ecosystem.map((item) => (
              <Link
                key={item.title}
                href={item.route}
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-2xl
                  border
                  border-white/[0.07]
                  bg-white/[0.02]
                  px-6
                  py-6
                  transition-all
                  duration-400
                  hover:border-white/[0.15]
                  hover:bg-white/[0.045]
                  hover:shadow-[0_20px_60px_rgba(0,0,0,0.2)]
                "
              >
                <div
                  className="
                    absolute
                    right-0
                    top-0
                    h-32
                    w-32
                    translate-x-1/2
                    -translate-y-1/2
                    rounded-full
                    bg-white/[0.025]
                    blur-3xl
                    transition-all
                    duration-500
                    group-hover:bg-white/[0.055]
                  "
                />

                <div className="relative flex items-start justify-between">
                  <span
                    className="
                      text-[9px]
                      font-medium
                      tracking-[0.25em]
                      text-white/20
                    "
                  >
                    {item.index}
                  </span>

                  <span
                    className="
                      text-lg
                      text-white/25
                      transition-all
                      duration-300
                      group-hover:translate-x-1
                      group-hover:text-white/70
                    "
                  >
                    ↗
                  </span>
                </div>

                <div className="relative mt-8">
                  <h3
                    className="
                      text-lg
                      font-medium
                      tracking-[-0.02em]
                      text-white/80
                      transition-colors
                      duration-300
                      group-hover:text-white
                    "
                  >
                    {item.title}
                  </h3>

                  <p
                    className="
                      mt-2
                      text-xs
                      text-white/30
                      transition-colors
                      duration-300
                      group-hover:text-white/45
                    "
                  >
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer
          className="
            flex
            flex-col
            gap-2
            border-t
            border-white/[0.06]
            pt-6
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <p
            className="
              text-[9px]
              uppercase
              tracking-[0.28em]
              text-white/20
            "
          >
            African born · Globally built
          </p>

          <p className="text-[10px] text-white/15">
            MARKA Global Digital Economy
          </p>
        </footer>
      </div>
    </FadeIn>
  );
}
