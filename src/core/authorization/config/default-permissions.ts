import {
  Permissions,
  type PermissionAction,
} from "../permissions.catalog";

export const DefaultPermissions: PermissionAction[] = [
  Permissions.USER_READ,
  Permissions.USER_CREATE,
  Permissions.USER_UPDATE,

  Permissions.VENDOR_CREATE,
  Permissions.VENDOR_UPDATE,
  Permissions.VENDOR_MANAGE,

  Permissions.PRODUCT_CREATE,
  Permissions.PRODUCT_UPDATE,
  Permissions.PRODUCT_DELETE,

  Permissions.ORDER_READ,
  Permissions.ORDER_CREATE,
  Permissions.ORDER_MANAGE,

  Permissions.PAYMENT_PROCESS,

  Permissions.WALLET_READ,
  Permissions.WALLET_MANAGE,

  Permissions.SETTLEMENT_PAYOUT_EXECUTE,
  Permissions.SETTLEMENT_RECONCILIATION_EXECUTE,
  Permissions.SETTLEMENT_RECONCILIATION_RESOLVE,

  Permissions.ADMIN_ACCESS,
  Permissions.SYSTEM_ADMIN,
];
