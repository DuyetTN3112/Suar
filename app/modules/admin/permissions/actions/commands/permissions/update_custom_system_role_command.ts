import type { AdminActionContext } from '#modules/admin/permissions/actions/action_context'
import { BaseCommand } from '#modules/admin/permissions/actions/commands/permissions/base_command'
import type {
  AdminCustomSystemRoleGateway,
  AdminCustomSystemRoleInput,
  AdminCustomSystemRoleRecord,
} from '#modules/admin/permissions/actions/ports/outbound/permissions/admin_custom_system_role_gateway'
import { assertWildcardPermissionConfirmed } from '#modules/admin/permissions/domain/permissions/custom_system_role_policy'

export interface UpdateCustomSystemRoleInput extends AdminCustomSystemRoleInput {
  roleId: string
  actorSystemRole?: string | null
  confirmWildcard?: boolean
}

export type UpdateCustomSystemRoleResult =
  | { status: 'updated'; role: AdminCustomSystemRoleRecord }
  | { status: 'code_taken' }
  | { status: 'not_found' }

export default class UpdateCustomSystemRoleCommand extends BaseCommand<
  UpdateCustomSystemRoleInput,
  UpdateCustomSystemRoleResult
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly roles: AdminCustomSystemRoleGateway
  ) {
    super(execCtx)
  }

  async handle(input: UpdateCustomSystemRoleInput): Promise<UpdateCustomSystemRoleResult> {
    assertWildcardPermissionConfirmed(input, input.actorSystemRole)

    if (await this.roles.isCodeTaken(input.code, input.roleId)) {
      return { status: 'code_taken' }
    }

    const role = await this.roles.update(input.roleId, {
      name: input.name,
      code: input.code,
      ...(input.description === undefined ? {} : { description: input.description }),
      permissions: input.permissions,
    })

    return role ? { status: 'updated', role } : { status: 'not_found' }
  }
}
