"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  useAuth,
} from "@/frontend/providers/auth/AuthProvider";

import {
  NavigationConfig,
} from "./navigation.config";

const icons: Record<
  string,
  React.ReactNode
> = {
  Overview: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect
        x="3.5"
        y="3.5"
        width="7"
        height="7"
        rx="1.5"
      />
      <rect
        x="13.5"
        y="3.5"
        width="7"
        height="7"
        rx="1.5"
      />
      <rect
        x="3.5"
        y="13.5"
        width="7"
        height="7"
        rx="1.5"
      />
      <rect
        x="13.5"
        y="13.5"
        width="7"
        height="7"
        rx="1.5"
      />
    </svg>
  ),

  Marketplace: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 9.5h16" />
      <path d="M5.5 9.5 7 4h10l1.5 5.5" />
      <path d="M5 9.5v9.5h14V9.5" />
      <path d="M9 19v-5h6v5" />
    </svg>
  ),

  Wallet: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2.5"
      />
      <path d="M3.5 9h17" />
      <path d="M16 13h2.5" />
    </svg>
  ),

  Orders: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 4.5h12v15H6z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  ),

  "Command Center": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 18V9" />
      <path d="M10 18V5" />
      <path d="M16 18v-7" />
      <path d="M22 18V3" />
    </svg>
  ),

  Products: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </svg>
  ),

  Sales: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M5 19V10" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
    </svg>
  ),

  Analytics: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 19.5h16" />
      <path d="m6 16 4-5 3 3 5-7" />
      <circle
        cx="6"
        cy="16"
        r="1"
      />
      <circle
        cx="10"
        cy="11"
        r="1"
      />
      <circle
        cx="13"
        cy="14"
        r="1"
      />
      <circle
        cx="18"
        cy="7"
        r="1"
      />
    </svg>
  ),

  Users: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle
        cx="9"
        cy="8"
        r="3"
      />
      <path d="M3.5 19c.6-3.3 2.4-5 5.5-5s4.9 1.7 5.5 5" />
      <path d="M15 5.5a3 3 0 0 1 0 5.8" />
      <path d="M16 14c2.3.5 3.7 2.1 4.5 5" />
    </svg>
  ),

  Reports: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 3.5h9l3 3V20.5H6z" />
      <path d="M14 3.5v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  ),

  System: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle
        cx="12"
        cy="12"
        r="3"
      />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.05.05-1.8 1.8-.05-.05a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65v.1h-2.55v-.1a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-2 .36l-.05.05-1.8-1.8.05-.05a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.65-1.1h-.1v-2.55h.1a1.8 1.8 0 0 0 1.65-1.1 1.8 1.8 0 0 0-.36-2l-.05-.05 1.8-1.8.05.05a1.8 1.8 0 0 0 2 .36 1.8 1.8 0 0 0 1.1-1.65v-.1h2.55v.1a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 2-.36l.05-.05 1.8 1.8-.05.05a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.65 1.1h.1v2.55h-.1a1.8 1.8 0 0 0-1.65 1.1Z" />
    </svg>
  ),

  Everything: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
      />
      <path d="M12 3.5v17" />
      <path d="M3.5 12h17" />
      <path d="M6 6c3.5 2.5 8.5 2.5 12 0" />
      <path d="M6 18c3.5-2.5 8.5-2.5 12 0" />
    </svg>
  ),
};

export default function Sidebar() {
  const pathname =
    usePathname();

  const {
    user,
    organizations,
    activeOrganization,
    authorization,
    loading,
    setActiveOrganization,
    hasAnyPermission,
  } = useAuth();

  const role =
    user?.role || "CUSTOMER";

  const configuredSections =
    NavigationConfig[
      role as keyof typeof NavigationConfig
    ] ||
    NavigationConfig.CUSTOMER;

  const sections =
    configuredSections
      .map((section) => ({
        ...section,

        items:
          section.items.filter(
            (item) =>
              !item.permissions ||
              item.permissions.length === 0 ||
              hasAnyPermission(
                item.permissions
              )
          ),
      }))
      .filter(
        (section) =>
          section.items.length > 0
      );

  const handleOrganizationChange =
    async (
      event: React.ChangeEvent<HTMLSelectElement>
    ) => {
      const organizationId =
        event.target.value;

      if (
        !organizationId ||
        organizationId ===
          activeOrganization?.id
      ) {
        return;
      }

      try {
        await setActiveOrganization(
          organizationId
        );
      } catch (error) {
        console.error(
          "[SIDEBAR_ORGANIZATION_CHANGE_ERROR]",
          error
        );
      }
    };

  return (
    <aside
      className="
        sticky
        top-0
        hidden
        h-screen
        w-[286px]
        shrink-0
        overflow-y-auto
        border-r
        border-white/[0.07]
        bg-black/45
        px-5
        py-7
        backdrop-blur-3xl
        lg:block
      "
    >
      <div className="flex h-full flex-col">
        <div className="px-3">
          <Link
            href="/app"
            className="
              group
              block
              rounded-2xl
              transition-opacity
              duration-300
              hover:opacity-90
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  relative
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-xl
                  border
                  border-white/15
                  bg-white/[0.035]
                  shadow-[0_10px_30px_rgba(0,0,0,0.4)]
                "
              >
                <div
                  className="
                    absolute
                    inset-0
                    bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_55%)]
                  "
                />

                <span
                  className="
                    relative
                    text-sm
                    font-semibold
                    tracking-[0.16em]
                    text-white
                  "
                >
                  M
                </span>
              </div>

              <div>
                <p
                  className="
                    bg-gradient-to-b
                    from-white
                    to-neutral-500
                    bg-clip-text
                    text-[17px]
                    font-semibold
                    tracking-[0.2em]
                    text-transparent
                  "
                >
                  MARKA
                </p>

                <p
                  className="
                    mt-0.5
                    text-[9px]
                    uppercase
                    tracking-[0.25em]
                    text-white/30
                  "
                >
                  Global Platform
                </p>
              </div>
            </div>
          </Link>
        </div>

        {organizations.length > 0 && (
          <div className="mt-6 px-3">
            <label
              htmlFor="marka-active-organization"
              className="
                mb-2
                block
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.25em]
                text-white/25
              "
            >
              Organization
            </label>

            <div className="relative">
              <select
                id="marka-active-organization"
                value={
                  activeOrganization?.id ??
                  ""
                }
                onChange={
                  handleOrganizationChange
                }
                disabled={loading}
                className="
                  w-full
                  appearance-none
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-white/[0.035]
                  px-3
                  py-2.5
                  pr-8
                  text-[11px]
                  text-white/70
                  outline-none
                  transition
                  focus:border-white/20
                  disabled:cursor-wait
                  disabled:opacity-50
                "
              >
                {organizations.map(
                  (organization) => (
                    <option
                      key={organization.id}
                      value={
                        organization.id
                      }
                      className="bg-neutral-950"
                    >
                      {organization.name}
                    </option>
                  )
                )}
              </select>

              <span
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  text-[9px]
                  text-white/30
                "
              >
                ▼
              </span>
            </div>

            {activeOrganization && (
              <p className="mt-2 truncate text-[9px] text-white/20">
                {activeOrganization.slug}
              </p>
            )}
          </div>
        )}

        <div
          className="
            mx-3
            my-8
            h-px
            bg-gradient-to-r
            from-transparent
            via-white/10
            to-transparent
          "
        />

        <nav
          className="flex-1 space-y-8"
          aria-label="MARKA navigation"
        >
          {sections.map(
            (section) => (
              <div
                key={section.group}
              >
                <p
                  className="
                    mb-3
                    px-3
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.28em]
                    text-white/25
                  "
                >
                  {section.group}
                </p>

                <div className="space-y-1">
                  {section.items.map(
                    (item) => {
                      const isActive =
                        pathname ===
                          item.route ||
                        (item.route !==
                          "/app" &&
                          pathname.startsWith(
                            `${item.route}/`
                          ));

                      return (
                        <Link
                          key={
                            item.route
                          }
                          href={
                            item.route
                          }
                          aria-current={
                            isActive
                              ? "page"
                              : undefined
                          }
                          className={`
                            group
                            relative
                            flex
                            items-center
                            gap-3
                            rounded-2xl
                            border
                            px-3
                            py-3
                            transition-all
                            duration-300
                            ${
                              isActive
                                ? "border-white/[0.12] bg-white/[0.07] text-white shadow-[0_12px_35px_rgba(0,0,0,0.22)]"
                                : "border-transparent text-white/45 hover:border-white/[0.07] hover:bg-white/[0.035] hover:text-white/80"
                            }
                          `}
                        >
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="
                                absolute
                                -left-px
                                top-1/2
                                h-7
                                w-px
                                -translate-y-1/2
                                bg-white
                                shadow-[0_0_12px_rgba(255,255,255,0.7)]
                              "
                            />
                          )}

                          <span
                            className={`
                              flex
                              h-9
                              w-9
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              border
                              transition-all
                              duration-300
                              ${
                                isActive
                                  ? "border-white/15 bg-white/[0.08] text-white"
                                  : "border-white/[0.06] bg-white/[0.02] text-white/35 group-hover:border-white/10 group-hover:text-white/65"
                              }
                            `}
                          >
                            <span className="h-[17px] w-[17px]">
                              {icons[
                                item.title
                              ] ||
                                icons.Overview}
                            </span>
                          </span>

                          <span className="min-w-0">
                            <span
                              className={`
                                block
                                truncate
                                text-[13px]
                                font-medium
                                ${
                                  isActive
                                    ? "text-white"
                                    : "text-white/55 group-hover:text-white/85"
                                }
                              `}
                            >
                              {
                                item.title
                              }
                            </span>

                            <span
                              className="
                                mt-0.5
                                block
                                truncate
                                text-[10px]
                                text-white/25
                                transition-colors
                                group-hover:text-white/35
                              "
                            >
                              {
                                item.description
                              }
                            </span>
                          </span>
                        </Link>
                      );
                    }
                  )}
                </div>
              </div>
            )
          )}

          {sections.length ===
            0 && (
            <div className="px-3">
              <p className="text-[11px] leading-5 text-white/30">
                No operational capabilities
                are available for the active
                organization.
              </p>
            </div>
          )}
        </nav>

        <div className="mt-8">
          <div
            className="
              relative
              overflow-hidden
              rounded-2xl
              border
              border-white/[0.07]
              bg-white/[0.025]
              px-4
              py-4
            "
          >
            <div
              aria-hidden="true"
              className="
                absolute
                -right-8
                -top-8
                h-24
                w-24
                rounded-full
                bg-white/[0.04]
                blur-2xl
              "
            />

            <p
              className="
                relative
                text-[9px]
                uppercase
                tracking-[0.25em]
                text-white/25
              "
            >
              MARKA Status
            </p>

            <div className="relative mt-3 flex items-center gap-2">
              <span
                className="
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-white
                  shadow-[0_0_10px_rgba(255,255,255,0.7)]
                "
              />

              <span className="text-[11px] text-white/50">
                Platform operational
              </span>
            </div>

            {authorization.organizationId && (
              <p className="relative mt-2 truncate text-[9px] text-white/20">
                {authorization.roles.join(
                  " · "
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
