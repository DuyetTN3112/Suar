import type { AdminActionContext } from '#modules/admin/permissions/actions/action_context'
import { BaseCommand } from '#modules/admin/permissions/actions/command/base_command'
import type { AdminCustomSystemRoleGateway } from '#modules/admin/permissions/actions/ports/outbound/admin_custom_system_role_gateway'

export default class DeleteCustomSystemRoleCommand extends BaseCommand<
  { roleId: string },
  boolean
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly roles: AdminCustomSystemRoleGateway
  ) {
    super(execCtx)
  }

  handle(input: { roleId: string }): Promise<boolean> {
    return this.roles.delete(input.roleId)
  }
}
