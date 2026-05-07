import type { AdminActionContext } from '#modules/admin/permissions/actions/action_context'
import type {
  AdminCustomSystemRoleGateway,
  AdminCustomSystemRoleRecord,
} from '#modules/admin/permissions/actions/ports/outbound/permissions/admin_custom_system_role_gateway'
import { BaseQuery } from '#modules/admin/permissions/actions/queries/permissions/base_query'

export default class GetCustomSystemRoleQuery extends BaseQuery<
  { roleId: string },
  AdminCustomSystemRoleRecord | null
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly roles: AdminCustomSystemRoleGateway
  ) {
    super(execCtx)
  }

  handle(input: { roleId: string }): Promise<AdminCustomSystemRoleRecord | null> {
    return this.roles.find(input.roleId)
  }
}
