import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import Organization from '#models/organization'

/**
 * ListOrganizationsQuery (System Admin)
 *
 * Query to list all organizations in the system with filtering and pagination.
 * Only accessible by system admins.
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
  constructor(execCtx: ExecutionContext) {
    super(execCtx)
  }

  async handle(dto: ListOrganizationsDTO): Promise<ListOrganizationsResult> {
    const page = dto.page || 1
    const perPage = dto.perPage || 50

    // Build query
    const query = Organization.query()

    // Search filter
    if (dto.search) {
      query.where((q) => {
        q.where('name', 'ilike', `%${dto.search}%`).orWhere('slug', 'ilike', `%${dto.search}%`)
      })
    }

    // Plan filter
    if (dto.plan) {
      query.where('plan', dto.plan)
    }

    // Partner type filter
    if (dto.partnerType) {
      query.where('partner_type', dto.partnerType)
    }

    // Order by created_at DESC
    query.orderBy('created_at', 'desc')

    // Execute with pagination
    const result = await query.paginate(page, perPage)

    return {
      data: result.all().map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        owner_id: org.owner_id,
        partner_type: org.partner_type,
        partner_is_active: org.partner_is_active,
        created_at: org.created_at.toISO(),
      })),
      meta: {
        total: result.total,
        perPage: result.perPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
      },
    }
  }
}
