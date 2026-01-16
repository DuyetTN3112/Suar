import AuthorizeSystemUserAdminAccessQuery from '#modules/authorization/actions/queries/authorize_system_user_admin_access_query'
import { SystemUserAdminAccessAuthorizer } from '#modules/users/actions/ports/outbound/system_user_admin_access_authorizer'

export class AuthorizationSystemUserAdminAccessAdapter extends SystemUserAdminAccessAuthorizer {
  override authorize(userId: string, organizationId: string): Promise<void> {
    return AuthorizeSystemUserAdminAccessQuery.authorize(userId, organizationId)
  }

  override isAllowed(userId: string, organizationId: string): Promise<boolean> {
    return AuthorizeSystemUserAdminAccessQuery.execute(userId, organizationId)
  }
}
