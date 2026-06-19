import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { canUpdateOrganization } from '#modules/organizations/domain/access/org_permission_policy'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/settings/organization_persistence'
import { BaseQuery } from '#modules/organizations/actions/queries/base_query'

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
    execCtx: OrganizationActionContext,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {
    super(execCtx)
  }

  async handle(_dto: GetOrganizationSettingsDTO): Promise<GetOrganizationSettingsResult> {
    const organizationId = this.getCurrentOrganizationId()
    const userId = this.getCurrentUserId()
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }
    if (!userId) {
      throw new UnauthorizedException()
    }

    const actorMembership = await this.memberships.getContext(organizationId, userId)
    const actorOrgRole = actorMembership?.role ?? null
    enforcePolicy(canUpdateOrganization(actorOrgRole))

    // Fetch from repository
    const organization = await this.organizations.findById(organizationId)

    if (!organization) {
      throw new NotFoundException(ErrorMessages.ORGANIZATION_NOT_FOUND)
    }

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        website: organization.website,
        email: null,
      },
    }
  }
}
