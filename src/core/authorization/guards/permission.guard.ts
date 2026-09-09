import { AuthorizationService } from "../authorization.service";

export class PermissionGuard {

  private authorization =
    new AuthorizationService();


  async canActivate(
    userId: string,
    permission: string
  ) {

    return this.authorization.hasPermission(
      userId,
      permission
    );

  }

}
