import type { AdminActionContext } from '#modules/admin/permissions/actions/action_context'
import type CreateCustomSystemRoleCommand from '#modules/admin/permissions/actions/command/create_custom_system_role_command'
import type DeleteCustomSystemRoleCommand from '#modules/admin/permissions/actions/command/delete_custom_system_role_command'
import type UpdateCustomSystemRoleCommand from '#modules/admin/permissions/actions/command/update_custom_system_role_command'
import type GetCustomSystemRoleQuery from '#modules/admin/permissions/actions/query/get_custom_system_role_query'
import type GetPermissionMatrixQuery from '#modules/admin/permissions/actions/query/get_permission_matrix_query'

export abstract class AdminPermissionActionFactory {
  abstract makeGetPermissionMatrixQuery(
    execCtx: AdminActionContext
  ): GetPermissionMatrixQuery

  abstract makeGetCustomSystemRoleQuery(
    execCtx: AdminActionContext
  ): GetCustomSystemRoleQuery

  abstract makeCreateCustomSystemRoleCommand(
    execCtx: AdminActionContext
  ): CreateCustomSystemRoleCommand

  abstract makeUpdateCustomSystemRoleCommand(
    execCtx: AdminActionContext
  ): UpdateCustomSystemRoleCommand

  abstract makeDeleteCustomSystemRoleCommand(
    execCtx: AdminActionContext
  ): DeleteCustomSystemRoleCommand
}
