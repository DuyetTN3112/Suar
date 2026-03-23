import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import AdminOrganizationRepository from '#infra/admin/repositories/admin_organization_repository'

/**
 * ListOrganizationsQuery (System Admin)
 *
 * Query to list all organizations in the system with filtering and pagination.
 * Uses repository (Infrastructure layer) for DB queries.
 */

export interface ListOrganizationsDTO {
  page?: number
  perPage?: number
  search?: string
  plan?: string
  partnerType?: string
}

export interface ListOrganizationsResult {
  data: Array<{
    id: string
    name: string
    slug: string
    plan: string
    owner_id: string
    partner_type: string | null
    partner_is_active: boolean
    created_at: string
  }>
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export default class ListOrganizationsQuery extends BaseQuery<
  ListOrganizationsDTO,
  ListOrganizationsResult
> {
  constructor(
    execCtx: ExecutionContext,
    private orgRepo = new AdminOrganizationRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: ListOrganizationsDTO): Promise<ListOrganizationsResult> {
    const page = dto.page || 1
    const perPage = dto.perPage || 50

    // Fetch from repository (Infrastructure layer)
    const result = await this.orgRepo.listOrganizations(
      {
        search: dto.search,
        plan: dto.plan,
        partnerType: dto.partnerType,
      },
      page,
      perPage
    )

    const lastPage = Math.ceil(result.total / perPage)

    return {
      data: result.organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description || null,
        plan: org.plan || 'free',
        owner_id: org.owner_id,
        owner: {
          id: org.owner.id,
          username: org.owner.username,
          email: org.owner.email,
        },
        partner_type: org.partner_type,
        partner_is_active: org.partner_is_active || false,
        created_at: org.created_at?.toISO() || new Date().toISOString(),
        updated_at: org.updated_at?.toISO() || new Date().toISOString(),
        _count: {
          members: org.$extras.members_count || 0,
          projects: org.$extras.projects_count || 0,
        },
      })),
      meta: {
        total: result.total,
        perPage,
        currentPage: page,
        lastPage,
      },
    }
  }
}
