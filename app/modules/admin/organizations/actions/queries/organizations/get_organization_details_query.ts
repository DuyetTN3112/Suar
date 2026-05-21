import type { AdminActionContext } from '#modules/admin/organizations/actions/action_context'
import type { AdminOrganizationRepository } from '#modules/admin/organizations/actions/ports/outbound/organizations/admin_operational_repository'
import { BaseQuery } from '#modules/admin/organizations/actions/queries/organizations/base_query'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'

/**
 * GetOrganizationDetailsQuery (System Admin)
 *
 * Query to get detailed information about a specific organization.
 */

export interface GetOrganizationDetailsDTO {
  organizationId: string
}

export interface OrganizationDetailsResult {
  id: string
  name: string
  slug: string
  description: string | null
  partner_type: string | null
  created_at: string
  updated_at: string
  owner: {
    id: string
    username: string
    email: string | null
  }
  stats: {
    usersCount: number
    projectsCount: number
  }
}

export default class GetOrganizationDetailsQuery extends BaseQuery<
  GetOrganizationDetailsDTO,
  OrganizationDetailsResult
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly orgRepo: AdminOrganizationRepository
  ) {
    super(execCtx)
  }

  async handle(dto: GetOrganizationDetailsDTO): Promise<OrganizationDetailsResult> {
    const org = await this.orgRepo.findById(dto.organizationId)

    if (!org) {
      throw NotFoundException.organization(dto.organizationId)
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      partner_type: org.partnerType,
      created_at: org.createdAt,
      updated_at: org.updatedAt,
      owner: {
        id: org.owner.id,
        username: org.owner.username,
        email: org.owner.email,
      },
      stats: {
        usersCount: org.usersCount,
        projectsCount: org.projectsCount,
      },
    }
  }
}
