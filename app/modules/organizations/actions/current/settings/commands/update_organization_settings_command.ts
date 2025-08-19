import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/organizations/actions/base_command'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canUpdateOrganization } from '#modules/organizations/domain/org_permission_policy'
import * as OrganizationSettingsMutations from '#modules/organizations/infra/current/repositories/write/organization_settings_mutations'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'

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
    execCtx: OrganizationActionContext,
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

    const actorMembership = await membershipQueries.getMembershipContext(
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
