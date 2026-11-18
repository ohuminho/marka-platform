export type LoginAccountAccess = {
  status: string;
  role: string;
  isFounder: boolean;
};

/**
 * Privileged accounts bypass ordinary login quotas only while active.
 * Authentication and account-status checks still run in the login handler.
 */
export function isPrivilegedLoginAccount(
  user: LoginAccountAccess | null | undefined,
): boolean {
  return Boolean(
    user &&
      user.status === "ACTIVE" &&
      (user.isFounder || user.role === "ADMIN" || user.role === "SUPER_ADMIN"),
  );
}
