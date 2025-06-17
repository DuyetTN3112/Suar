import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import AdminOrganizationRepository from '#infra/admin/repositories/admin_organization_repository'

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
  plan: string | null
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
    execCtx: ExecutionContext,
    private orgRepo = new AdminOrganizationRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: GetOrganizationDetailsDTO): Promise<OrganizationDetailsResult> {
    const org = await this.orgRepo.findById(dto.organizationId)

    if (!org) {
      throw new Error(`Organization not found: ${dto.organizationId}`)
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      plan: org.plan,
      partner_type: org.partner_type,
      created_at: org.created_at?.toISO() || new Date().toISOString(),
      updated_at: org.updated_at?.toISO() || new Date().toISOString(),
      owner: {
        id: org.owner.id,
        username: org.owner.username,
        email: org.owner.email,
      },
      stats: {
        usersCount: org.$extras.users_count || 0,
        projectsCount: org.$extras.projects_count || 0,
      },
    }
  }
}
