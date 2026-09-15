import { AuthorizationService } from "../authorization.service";

export class PermissionGuard {
  private readonly authorization = new AuthorizationService();

  async canActivate(
    userId: string,
    permission: string,
    organizationId?: string
  ): Promise<boolean> {
    return this.authorization.hasPermission(
      userId,
      permission,
      organizationId
    );
  }
}
