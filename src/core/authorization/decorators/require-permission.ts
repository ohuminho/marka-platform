export interface RequiredPermission {
  permission: string;
}

export function RequirePermission(
  permission: string
): RequiredPermission {
  if (!permission.trim()) {
    throw new Error(
      "Permission is required."
    );
  }

  return {
    permission,
  };
}
