import { BaseQuery } from '#actions/admin/base_query'
import type { PartnerType } from '#constants/organization_constants'
import { AdminOrganizationReadOps } from '#infra/admin/repositories/read/admin_organization_queries'
import type { ExecutionContext } from '#types/execution_context'

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const getExtrasNumber = (value: unknown, key: string): number => {
  if (typeof value !== 'object' || value === null) {
    return 0
  }
  const extras = (value as { $extras?: unknown }).$extras
  if (typeof extras !== 'object' || extras === null) {
    return 0
  }
  return toNumberValue((extras as Record<string, unknown>)[key])
}

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
  partnerType?: PartnerType
}

export interface ListOrganizationsResult {
  data: {
    id: string
    name: string
    slug: string
    description: string | null
    owner_id: string
    owner: {
      id: string
      username: string
      email: string
    }
    partner_type: string | null
    partner_is_active: boolean
    created_at: string
    updated_at: string
    _count: {
      members: number
      projects: number
    }
  }[]
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
    private orgRepo = AdminOrganizationReadOps
  ) {
    super(execCtx)
  }

  async handle(dto: ListOrganizationsDTO): Promise<ListOrganizationsResult> {
    const page = dto.page ?? 1
    const perPage = dto.perPage ?? 50

    // Fetch from repository (Infrastructure layer)
    const result = await this.orgRepo.listOrganizations(
      {
        search: dto.search,
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
        description: org.description ?? null,
        owner_id: org.owner_id,
        owner: {
          id: org.owner.id,
          username: org.owner.username,
          email: org.owner.email ?? '',
        },
        partner_type: org.partner_type,
        partner_is_active: org.partner_is_active ?? false,
        created_at: org.created_at.toISO() ?? new Date().toISOString(),
        updated_at: org.updated_at.toISO() ?? new Date().toISOString(),
        _count: {
          members: getExtrasNumber(org, 'users_count'),
          projects: getExtrasNumber(org, 'projects_count'),
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
