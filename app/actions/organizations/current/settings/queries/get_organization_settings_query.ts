import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseQuery } from '#actions/organizations/base_query'
import OrganizationSettingsRepository from '#infra/organizations/current/repositories/organization_settings_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import { canUpdateOrganization } from '#modules/organizations/domain/org_permission_policy'
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

    const actorMembership = await OrganizationUserRepository.getMembershipContext(
      organizationId,
      userId
    )
    const actorOrgRole = actorMembership?.role ?? null
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
