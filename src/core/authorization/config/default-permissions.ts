import {
  Permissions,
  type PermissionAction,
} from "../permissions.catalog";

// Keep the seed and runtime authorization catalog aligned.
export const DefaultPermissions: PermissionAction[] =
  Object.values(Permissions);
