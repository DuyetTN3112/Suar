import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseCommand } from '#actions/organizations/base_command'
import { sanitizeCustomRoleDefinitions } from '#domain/organizations/org_access_rules'
import { canUpdateOrganization } from '#domain/organizations/org_permission_policy'
import * as OrganizationSettingsMutations from '#infra/organizations/current/repositories/write/organization_settings_mutations'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { ExecutionContext } from '#types/execution_context'

export interface UpdateCustomRolesDTO {
  custom_roles: unknown
}

export default class UpdateCustomRolesCommand extends BaseCommand<UpdateCustomRolesDTO> {
  constructor(
    execCtx: ExecutionContext,
    private settingsRepo = OrganizationSettingsMutations
  ) {
    super(execCtx)
  }

  async handle(dto: UpdateCustomRolesDTO): Promise<void> {
    const organizationId = this.getCurrentOrganizationId()
    const userId = this.getCurrentUserId()
    if (!organizationId) {
      throw new Error('Organization context required')
    }
    if (!userId) {
      throw new Error('User context required')
    }

    const actorMembership = await OrganizationUserRepository.getMembershipContext(
      organizationId,
      userId
    )
    const actorOrgRole = actorMembership?.role ?? null
    enforcePolicy(canUpdateOrganization(actorOrgRole))

    await this.settingsRepo.updateOrganization(organizationId, {
      custom_roles: sanitizeCustomRoleDefinitions(dto.custom_roles),
    })
  }
}
