import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseCommand } from '#actions/organizations/base_command'
import * as OrganizationSettingsMutations from '#infra/organizations/current/repositories/write/organization_settings_mutations'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import { canUpdateOrganization } from '#modules/organizations/domain/org_permission_policy'
import type { ExecutionContext } from '#types/execution_context'

/**
 * UpdateOrganizationSettingsCommand
 *
 * Command to update organization settings.
 */

export interface UpdateOrganizationSettingsDTO {
  name?: string
  description?: string
  website?: string
  email?: string
}

export default class UpdateOrganizationSettingsCommand extends BaseCommand<UpdateOrganizationSettingsDTO> {
  constructor(
    execCtx: ExecutionContext,
    private settingsRepo = OrganizationSettingsMutations
  ) {
    super(execCtx)
  }

  async handle(dto: UpdateOrganizationSettingsDTO): Promise<void> {
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

    // Update via repository
    await this.settingsRepo.updateOrganization(organizationId, {
      name: dto.name,
      description: dto.description,
      website: dto.website,
    })
  }
}
