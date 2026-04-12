import { BaseCommand } from '#actions/shared/base_command'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { sanitizeCustomRoleDefinitions } from '#domain/organizations/org_access_rules'
import { canUpdateOrganization } from '#domain/organizations/org_permission_policy'
import OrganizationSettingsRepository from '#infra/organization/repositories/organization_settings_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { ExecutionContext } from '#types/execution_context'

export interface UpdateCustomRolesDTO {
  custom_roles: unknown
}

export default class UpdateCustomRolesCommand extends BaseCommand<UpdateCustomRolesDTO> {
  constructor(
    execCtx: ExecutionContext,
    private settingsRepo = new OrganizationSettingsRepository()
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

    const actorOrgRole = await OrganizationUserRepository.getMemberRoleName(organizationId, userId)
    enforcePolicy(canUpdateOrganization(actorOrgRole))

    await this.settingsRepo.updateOrganization(organizationId, {
      custom_roles: sanitizeCustomRoleDefinitions(dto.custom_roles),
    })
  }
}
