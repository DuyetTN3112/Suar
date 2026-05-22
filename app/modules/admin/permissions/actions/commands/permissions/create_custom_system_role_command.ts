import type { AdminActionContext } from '#modules/admin/permissions/actions/action_context'
import { BaseCommand } from '#modules/admin/permissions/actions/commands/permissions/base_command'
import type {
  AdminCustomSystemRoleGateway,
  AdminCustomSystemRoleInput,
  AdminCustomSystemRoleRecord,
} from '#modules/admin/permissions/actions/ports/outbound/permissions/admin_custom_system_role_gateway'
import { assertWildcardPermissionConfirmed } from '#modules/admin/permissions/domain/permissions/custom_system_role_policy'

export interface CreateCustomSystemRoleInput extends AdminCustomSystemRoleInput {
  actorSystemRole?: string | null
  confirmWildcard?: boolean
}

export type CreateCustomSystemRoleResult =
  | { status: 'created'; role: AdminCustomSystemRoleRecord }
  | { status: 'code_taken' }

export default class CreateCustomSystemRoleCommand extends BaseCommand<
  CreateCustomSystemRoleInput,
  CreateCustomSystemRoleResult
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly roles: AdminCustomSystemRoleGateway
  ) {
    super(execCtx)
  }

  async handle(input: CreateCustomSystemRoleInput): Promise<CreateCustomSystemRoleResult> {
    assertWildcardPermissionConfirmed(input, input.actorSystemRole)

    if (await this.roles.isCodeTaken(input.code)) {
      return { status: 'code_taken' }
    }

    const role = await this.roles.create({
      name: input.name,
      code: input.code,
      ...(input.description === undefined ? {} : { description: input.description }),
      permissions: input.permissions,
    })

    return { status: 'created', role }
  }
}
