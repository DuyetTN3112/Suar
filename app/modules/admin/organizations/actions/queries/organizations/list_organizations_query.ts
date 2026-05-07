import type { AdminActionContext } from '#modules/admin/organizations/actions/action_context'
import { ADMIN_PAGINATION } from '#modules/admin/organizations/actions/dtos/common/organizations/admin_pagination'
import type { AdminOrganizationRepository } from '#modules/admin/organizations/actions/ports/outbound/organizations/admin_operational_repository'
import type { AdminOrganizationSearchCandidateReader } from '#modules/admin/organizations/actions/ports/outbound/organizations/admin_search_candidate_readers'
import { BaseQuery } from '#modules/admin/organizations/actions/queries/organizations/base_query'
import type { PartnerType } from '#modules/organizations/public_contracts/access/organization_constants'
import {
  buildPaginationMeta,
  normalizePagination,
  toWindowLimit,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { searchFallbackObserver } from '#modules/search/public_contracts/search_fallback_observer'

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
    private readonly organizationSearchCandidateReader: AdminOrganizationSearchCandidateReader,
    private readonly orgRepo: AdminOrganizationRepository
  ) {
    super(execCtx)
  }

  async handle(dto: ListOrganizationsDTO): Promise<ListOrganizationsResult> {
    const pagination = normalizePagination(dto, ADMIN_PAGINATION, { perPage: 50 })
    const organizationIds = await this.resolveSearchOrganizationIds(
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
        owner_id: org.ownerId,
        owner: {
          id: org.owner.id,
          username: org.owner.username,
          email: org.owner.email ?? '',
        },
        partner_type: org.partnerType,
        partner_is_active: org.partnerIsActive,
        created_at: org.createdAt,
        updated_at: org.updatedAt,
        _count: {
          members: org.usersCount,
          projects: org.projectsCount,
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

  private async resolveSearchOrganizationIds(
    search: string | undefined,
    page: number,
    perPage: number
  ): Promise<string[] | null> {
    if (!search?.trim() || !this.organizationSearchCandidateReader.isEnabled()) {
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
    } catch (error) {
      searchFallbackObserver.record({ surface: 'admin.organizations.list', error })
      return null
    }
  }
}
