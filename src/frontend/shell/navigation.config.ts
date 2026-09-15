// FILE: /workspaces/marka-platform/src/frontend/shell/navigation.config.ts

export type NavigationItem = {
  title: string;
  route: string;
  description: string;
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
          description: "Your MARKA command experience",
        },
        {
          title: "Marketplace",
          route: "/app/marketplace",
          description: "Discover products, services and stores",
        },
        {
          title: "Wallet",
          route: "/app/wallet",
          description: "Manage your digital finance",
        },
      ],
    },
    {
      group: "Activity",
      items: [
        {
          title: "Orders",
          route: "/app/orders",
          description: "Track purchases and transactions",
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
          description: "Your business command center",
        },
        {
          title: "Products",
          route: "/app/vendor/products",
          description: "Manage your catalogue",
        },
        {
          title: "Sales",
          route: "/app/vendor/sales",
          description: "Monitor commercial activity",
        },
        {
          title: "Analytics",
          route: "/app/vendor/analytics",
          description: "Business intelligence and insights",
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
          description: "Platform overview",
        },
        {
          title: "Users",
          route: "/app/admin/users",
          description: "Manage the MARKA community",
        },
        {
          title: "Reports",
          route: "/app/admin/reports",
          description: "Platform intelligence",
        },
        {
          title: "System",
          route: "/app/admin/system",
          description: "System management",
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
          description: "Global platform control",
        },
      ],
    },
  ],
} satisfies Record<string, NavigationSection[]>;
