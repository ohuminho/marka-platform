export interface RevenueMetrics {

  current: number;

  previous: number;

  growthPercentage: number;

  currency: string;

}



export interface SalesMetrics {

  totalOrders: number;

  completedOrders: number;

  cancelledOrders: number;

  averageOrderValue: number;

}



export interface InventoryMetrics {

  totalProducts: number;

  totalUnits: number;

  inventoryValue: number;

  lowStockProducts: number;

}



export interface StoreMetrics {

  rating: number;

  views: number;

  customers: number;

  verified: boolean;

}



export interface VendorDashboardMetrics {

  revenue: RevenueMetrics;

  sales: SalesMetrics;

  inventory: InventoryMetrics;

  store: StoreMetrics;

  generatedAt: Date;

}
