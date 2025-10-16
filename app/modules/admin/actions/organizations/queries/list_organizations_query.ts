import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import type { AdminOrganizationSearchCandidateReader } from '#modules/admin/actions/ports/admin_search_candidate_readers'
import { ADMIN_PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { EngineAdminOrganizationSearchCandidateReader } from '#modules/admin/infra/adapters/engine_admin_search_candidate_readers'
import { AdminOrganizationReadOps } from '#modules/admin/infra/repositories/read/admin_organization_queries'
import type { PartnerType } from '#modules/organizations/public_contracts/organization_constants'
import {
  buildPaginationMeta,
  normalizePagination,
  toWindowLimit,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'

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
    execCtx: AdminActionContext,
    private orgRepo = AdminOrganizationReadOps,
    private readonly organizationSearchCandidateReader: AdminOrganizationSearchCandidateReader = new EngineAdminOrganizationSearchCandidateReader()
  ) {
    super(execCtx)
  }

  async handle(dto: ListOrganizationsDTO): Promise<ListOrganizationsResult> {
    const pagination = normalizePagination(dto, ADMIN_PAGINATION, { perPage: 50 })
    const organizationIds = await this.resolveEngineOrganizationIds(
      dto.search,
      pagination.page,
      pagination.perPage
    )

    // Fetch from repository (Infrastructure layer).
      // Search index can lag behind freshly-created DB rows during tests/runtime; fall back to SQL
      // search when engine candidates do not resolve to any active organizations.
    let result = await this.orgRepo.listOrganizations(
      {
        ...(organizationIds || !dto.search ? {} : { search: dto.search }),
        ...(dto.partnerType ? { partnerType: dto.partnerType } : {}),
        ...(organizationIds ? { organizationIds } : {}),
      },
      pagination.page,
      pagination.perPage
    )

    if (organizationIds && result.organizations.length === 0 && dto.search?.trim()) {
      result = await this.orgRepo.listOrganizations(
        {
          search: dto.search,
          ...(dto.partnerType ? { partnerType: dto.partnerType } : {}),
        },
        pagination.page,
        pagination.perPage
      )
    }

    const meta = buildPaginationMeta(result.total, pagination)

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
        total: meta.total,
        perPage: meta.perPage,
        currentPage: meta.currentPage,
        lastPage: meta.lastPage,
      },
    }
  }

  private async resolveEngineOrganizationIds(
    search: string | undefined,
    page: number,
    perPage: number
  ): Promise<string[] | null> {
    if (!search?.trim() || !isSearchRuntimeEnabled()) {
      return null
    }

    try {
      const hits = await this.organizationSearchCandidateReader.searchOrganizationCandidates({
        q: search,
        limit: toWindowLimit(page, perPage),
      })

      if (hits.length === 0) {
        return null
      }

      return hits.map((hit) => hit.organizationId)
    } catch {
      return null
    }
  }
}
