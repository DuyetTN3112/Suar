import { enforcePolicy } from '#modules/authorization/actions/public_api'
import { BaseQuery } from '#modules/organizations/actions/base_query'
import { canUpdateOrganization } from '#modules/organizations/domain/org_permission_policy'
import OrganizationSettingsRepository from '#modules/organizations/infra/current/repositories/organization_settings_repository'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
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

    const actorMembership = await membershipQueries.getMembershipContext(
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
