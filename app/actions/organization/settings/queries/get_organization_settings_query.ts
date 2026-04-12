import { BaseQuery } from '#actions/shared/base_query'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canUpdateOrganization } from '#domain/organizations/org_permission_policy'
import OrganizationSettingsRepository from '#infra/organization/repositories/organization_settings_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { ExecutionContext } from '#types/execution_context'

/**
 * GetOrganizationSettingsQuery
 *
 * Query to get organization settings/details.
 */

export type GetOrganizationSettingsDTO = Record<string, never>

export interface GetOrganizationSettingsResult {
  organization: {
    id: string
    name: string
    description: string | null
    website: string | null
    email: string | null
  }
}

export default class GetOrganizationSettingsQuery extends BaseQuery<
  GetOrganizationSettingsDTO,
  GetOrganizationSettingsResult
> {
  constructor(
    execCtx: ExecutionContext,
    private settingsRepo = new OrganizationSettingsRepository()
  ) {
    super(execCtx)
  }

  async handle(_dto: GetOrganizationSettingsDTO): Promise<GetOrganizationSettingsResult> {
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

    // Fetch from repository
    const organization = await this.settingsRepo.getOrganization(organizationId)

    if (!organization) {
      throw new Error('Organization not found')
    }

    return {
      organization,
    }
  }
}
