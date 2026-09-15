// FILE: /workspaces/marka-platform/src/frontend/shell/TopNav.tsx

"use client";

import NotificationButton from "./components/NotificationButton";
import CartButton from "./components/CartButton";
import UserMenu from "./components/UserMenu";

export default function TopNav() {
  return (
    <header
      className="
        sticky
        top-0
        z-40
        h-24
        border-b
        border-white/[0.08]
        bg-black/45
        backdrop-blur-2xl
        flex
        items-center
        justify-between
        px-8
        lg:px-10
      "
    >
      <div className="flex items-center gap-6">
        <div
          className="
            relative
            flex
            h-11
            w-11
            items-center
            justify-center
            overflow-hidden
            rounded-2xl
            border
            border-white/15
            bg-white/[0.035]
            shadow-[0_8px_30px_rgba(0,0,0,0.35)]
          "
        >
          <div
            className="
              absolute
              inset-0
              bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_55%)]
            "
          />

          <span
            className="
              relative
              text-[13px]
              font-semibold
              tracking-[0.18em]
              text-white
            "
          >
            M
          </span>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <h2
              className="
                text-[15px]
                font-medium
                tracking-[0.12em]
                text-white
              "
            >
              MARKA
            </h2>

            <span
              className="
                hidden
                rounded-full
                border
                border-white/10
                bg-white/[0.035]
                px-2.5
                py-1
                text-[9px]
                font-medium
                uppercase
                tracking-[0.18em]
                text-white/45
                sm:inline-flex
              "
            >
              Global Platform
            </span>
          </div>

          <p
            className="
              mt-1
              text-xs
              tracking-wide
              text-white/40
            "
          >
            Executive Workspace
          </p>
        </div>
      </div>

      <div
        className="
          flex
          items-center
          gap-3
          lg:gap-4
        "
      >
        <div
          className="
            hidden
            h-12
            w-80
            items-center
            rounded-2xl
            border
            border-white/[0.08]
            bg-white/[0.025]
            px-4
            transition-all
            duration-300
            focus-within:border-white/20
            focus-within:bg-white/[0.045]
            md:flex
          "
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 text-white/35"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>

          <input
            aria-label="Search MARKA"
            placeholder="Search MARKA"
            className="
              ml-3
              w-full
              bg-transparent
              text-sm
              text-white
              outline-none
              placeholder:text-white/25
            "
          />

          <span
            className="
              hidden
              rounded-lg
              border
              border-white/10
              px-2
              py-1
              text-[9px]
              tracking-wider
              text-white/25
              lg:block
            "
          >
            /
          </span>
        </div>

        <div
          className="
            flex
            h-12
            items-center
            gap-1
            rounded-2xl
            border
            border-white/[0.08]
            bg-white/[0.025]
            px-1
          "
        >
          <NotificationButton />

          <CartButton />
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
