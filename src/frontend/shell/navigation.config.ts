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
          description: "Your MARKA command experience",
        },
        {
          title: "AI Assistant",
          route: "/app/assistant",
          description: "Get intelligent assistance inside MARKA",
        },
        {
          title: "Marketplace",
          route: "/app/marketplace",
          description: "Discover products, services and stores",
        },
        {
          title: "Open a Store",
          route: "/app/vendor/products",
          description: "Start a business and manage your product catalogue",
        },
        {
          title: "Messages",
          route: "/app/messages",
          description: "Converse with sellers and manage purchase enquiries",
        },
        {
          title: "Cart",
          route: "/app/cart",
          description: "Review items before checkout",
        },
        {
          title: "Mobility",
          route: "/app/mobility",
          description: "Rides, safety, dispatch and financial flow",
        },
        {
          title: "Wallet",
          route: "/app/wallet",
          description: "Manage your digital finance",
          permissions: ["WALLET_READ"],
        },
        {
          title: "Support",
          route: "/app/support",
          description: "Open and track support requests inside MARKA",
        },
        {
          title: "Account",
          route: "/app/account",
          description: "Identity, session and access context",
        },
        {
          title: "Compliance",
          route: "/app/compliance",
          description: "KYC, KYD, KYB and verification status",
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
          permissions: ["ORDER_READ"],
        },
        {
          title: "Available Deliveries",
          route: "/app/delivery-agent/offers",
          description: "Review and accept delivery offers",
          permissions: ["DELIVERY_AGENT_OPERATE"],
        },
        {
          title: "My Deliveries",
          route: "/app/delivery-agent/deliveries",
          description: "Operate and track assigned deliveries",
          permissions: ["DELIVERY_AGENT_OPERATE"],
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
          permissions: ["VENDOR_MANAGE"],
        },
        {
          title: "AI Assistant",
          route: "/app/assistant",
          description: "Get intelligent assistance for your business",
        },
        {
          title: "Mobility",
          route: "/app/mobility",
          description: "Mobility operations and settlements",
        },
        {
          title: "Products",
          route: "/app/vendor/products",
          description: "Manage your catalogue",
          permissions: ["PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE"],
        },
        {
          title: "Messages",
          route: "/app/messages",
          description: "Buyer enquiries and order conversations",
        },
        {
          title: "Sales",
          route: "/app/vendor/sales",
          description: "Monitor commercial activity",
          permissions: ["ORDER_READ", "ORDER_MANAGE"],
        },
        {
          title: "Analytics",
          route: "/app/vendor/analytics",
          description: "Business intelligence and insights",
          permissions: ["VENDOR_MANAGE"],
        },
        {
          title: "Support",
          route: "/app/support",
          description: "Open and track support requests inside MARKA",
        },
        {
          title: "Account",
          route: "/app/account",
          description: "Identity, session and access context",
        },
        {
          title: "Compliance",
          route: "/app/compliance",
          description: "KYC, KYD, KYB and verification status",
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
          permissions: ["ADMIN_ACCESS"],
        },
        {
          title: "AI Assistant",
          route: "/app/assistant",
          description: "AI assistance for platform operations",
        },
        {
          title: "Mobility",
          route: "/app/mobility/admin",
          description: "Passenger dispatch, drivers and operational control",
          permissions: ["ADMIN_ACCESS"],
        },
        {
          title: "Users",
          route: "/app/admin/users",
          description: "Manage the MARKA community",
          permissions: ["USER_READ", "USER_UPDATE"],
        },
        {
          title: "Delivery Agents",
          route: "/app/admin/delivery-agents",
          description: "Manage delivery operations and agents",
          permissions: ["DELIVERY_AGENT_MANAGE"],
        },
        {
          title: "Reports",
          route: "/app/admin/reports",
          description: "Platform intelligence",
          permissions: ["ADMIN_ACCESS"],
        },
        {
          title: "System",
          route: "/app/admin/system",
          description: "System management",
          permissions: ["SYSTEM_ADMIN"],
        },
        {
          title: "Driver Reviews",
          route: "/app/admin/mobility/drivers",
          description: "Review driver identity, licences and vehicle evidence",
          permissions: ["ADMIN_ACCESS"],
        },
        {
          title: "Store Approvals",
          route: "/app/admin/vendors",
          description: "Review and activate Marketplace sellers and stores",
          permissions: ["ADMIN_ACCESS"],
        },
        {
          title: "Compliance",
          route: "/app/admin/compliance",
          description: "Review KYC, KYD, KYB and compliance cases",
          permissions: ["ADMIN_ACCESS"],
        },
        {
          title: "Support",
          route: "/app/support",
          description: "Open and track support requests inside MARKA",
        },
        {
          title: "Account",
          route: "/app/account",
          description: "Identity, session and access context",
        },
      ],
    },
  ],
  DRIVER: [
    {
      group: "Mobility",
      items: [
        { title: "Driver Workspace", route: "/app/driver", description: "Driver operational workspace" },
        { title: "AI Assistant", route: "/app/assistant", description: "Get intelligent assistance" },
        
        { title: "Support", route: "/app/support", description: "Open and track support requests inside MARKA" },
        { title: "Account", route: "/app/account", description: "Identity, session and access context" },
        { title: "Compliance", route: "/app/compliance", description: "KYC, KYD and verification status" },
      ],
    },
  ],
  DELIVERY_AGENT: [
    {
      group: "Delivery",
      items: [
        { title: "Workspace", route: "/app/delivery-agent", description: "Delivery operations" },
        { title: "AI Assistant", route: "/app/assistant", description: "Get intelligent assistance" },
        { title: "Available Deliveries", route: "/app/delivery-agent/offers", description: "Review and accept delivery offers", permissions: ["DELIVERY_AGENT_OPERATE"] },
        { title: "My Deliveries", route: "/app/delivery-agent/deliveries", description: "Operate assigned deliveries", permissions: ["DELIVERY_AGENT_OPERATE"] },
        { title: "Support", route: "/app/support", description: "Open and track support requests inside MARKA" },
        { title: "Account", route: "/app/account", description: "Identity, session and access context" },
        { title: "Compliance", route: "/app/compliance", description: "KYC, KYD and verification status" },
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
          permissions: ["SYSTEM_ADMIN"],
        },
        {
          title: "AI Assistant",
          route: "/app/assistant",
          description: "AI assistance for global platform control",
        },
        {
          title: "Mobility",
          route: "/app/mobility/admin",
          description: "Global Mobility operations control",
          permissions: ["ADMIN_ACCESS"],
        },
        {
          title: "Driver Reviews",
          route: "/app/admin/mobility/drivers",
          description: "Global driver and vehicle verification",
          permissions: ["SYSTEM_ADMIN"],
        },
        {
          title: "Store Approvals",
          route: "/app/admin/vendors",
          description: "Global Marketplace seller and store approvals",
          permissions: ["SYSTEM_ADMIN"],
        },
        {
          title: "Compliance",
          route: "/app/admin/compliance",
          description: "Global KYC, KYD, KYB and compliance review",
          permissions: ["SYSTEM_ADMIN"],
        },
        {
          title: "Support",
          route: "/app/support",
          description: "Open and track support requests inside MARKA",
        },
        {
          title: "Account",
          route: "/app/account",
          description: "Identity, session and access context",
        },
      ],
    },
  ],
} satisfies Record<string, NavigationSection[]>;