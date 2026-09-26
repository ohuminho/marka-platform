import type {
  PermissionAction,
} from "@/core/authorization/permissions.catalog";

export type NavigationItem = {
  title: string;
  route: string;
  description: string;

  /**
   * At least one of these permissions must be
   * present for the item to be visible.
   *
   * When omitted, the item is available to the
   * authenticated user in the active organization.
   */
  permissions?: PermissionAction[];
};

export type NavigationSection = {
  group: string;
  items: NavigationItem[];
};

export const NavigationConfig = {
  CUSTOMER: [
    {
      group: "Experience",
      items: [
        {
          title: "Overview",
          route: "/app",
          description:
            "Your MARKA command experience",
        },
        {
          title: "Marketplace",
          route: "/app/marketplace",
          description:
            "Discover products, services and stores",
        },
        {
          title: "Mobility",
          route: "/app/mobility",
          description:
            "Rides, safety, dispatch and financial flow",
        },
        {
          title: "Wallet",
          route: "/app/wallet",
          description:
            "Manage your digital finance",
          permissions: [
            "WALLET_READ",
          ],
        },
      ],
    },

    {
      group: "Activity",
      items: [
        {
          title: "Orders",
          route: "/app/orders",
          description:
            "Track purchases and transactions",
          permissions: [
            "ORDER_READ",
          ],
        },
      ],
    },
  ],

  VENDOR: [
    {
      group: "Business",
      items: [
        {
          title: "Command Center",
          route: "/app/vendor",
          description:
            "Your business command center",
          permissions: [
            "VENDOR_MANAGE",
          ],
        },

        {
          title: "Mobility",
          route: "/app/mobility",
          description:
            "Mobility operations and settlements",
        },

        {
          title: "Products",
          route: "/app/vendor/products",
          description:
            "Manage your catalogue",
          permissions: [
            "PRODUCT_CREATE",
            "PRODUCT_UPDATE",
            "PRODUCT_DELETE",
          ],
        },

        {
          title: "Sales",
          route: "/app/vendor/sales",
          description:
            "Monitor commercial activity",
          permissions: [
            "ORDER_READ",
            "ORDER_MANAGE",
          ],
        },

        {
          title: "Analytics",
          route: "/app/vendor/analytics",
          description:
            "Business intelligence and insights",
          permissions: [
            "VENDOR_MANAGE",
          ],
        },
      ],
    },
  ],

  ADMIN: [
    {
      group: "Administration",
      items: [
        {
          title: "Overview",
          route: "/app/admin",
          description:
            "Platform overview",
          permissions: [
            "ADMIN_ACCESS",
          ],
        },

        {
          title: "Mobility",
          route: "/app/mobility",
          description:
            "Mobility operational control",
          permissions: [
            "ADMIN_ACCESS",
          ],
        },

        {
          title: "Users",
          route: "/app/admin/users",
          description:
            "Manage the MARKA community",
          permissions: [
            "USER_READ",
            "USER_UPDATE",
          ],
        },

        {
          title: "Reports",
          route: "/app/admin/reports",
          description:
            "Platform intelligence",
          permissions: [
            "ADMIN_ACCESS",
          ],
        },

        {
          title: "System",
          route: "/app/admin/system",
          description:
            "System management",
          permissions: [
            "SYSTEM_ADMIN",
          ],
        },
      ],
    },
  ],

  SUPER_ADMIN: [
    {
      group: "Control Center",
      items: [
        {
          title: "Everything",
          route: "/app/super-admin",
          description:
            "Global platform control",
          permissions: [
            "SYSTEM_ADMIN",
          ],
        },

        {
          title: "Mobility",
          route: "/app/mobility",
          description:
            "Global Mobility control",
          permissions: [
            "ADMIN_ACCESS",
          ],
        },
      ],
    },
  ],
} satisfies Record<
  string,
  NavigationSection[]
>;
