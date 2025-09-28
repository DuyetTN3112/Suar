import { enforcePolicy } from '#modules/authorization/actions/enforce_policy'
import { crossModulePermissionChecker } from '#modules/authorization/actions/permission/cross_module_permission_checker'
import AuthorizeSystemUserAdminAccessQuery from '#modules/authorization/actions/queries/authorize_system_user_admin_access_query'

export {
  AuthorizeSystemUserAdminAccessQuery,
  crossModulePermissionChecker,
  enforcePolicy,
}
