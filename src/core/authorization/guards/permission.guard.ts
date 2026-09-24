import {
  authorizationService,
} from "../authorization.service";

export class PermissionGuard {
  async canActivate(
    userId: string,
    permission: string,
    organizationId?: string
  ): Promise<boolean> {
    return authorizationService.hasPermission(
      userId,
      permission,
      organizationId
    );
  }
}

export const permissionGuard =
  new PermissionGuard();
