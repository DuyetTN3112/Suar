import db from '@adonisjs/lucid/services/db'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  buildPaginationMeta,
  normalizePagination,
  toOffset,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { REVIEW_PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'

export interface PendingSprintReviewPackageRecord {
  id: string
  sprint_id: string
  reviewer_id: string
  status: string
  created_at: string
  updated_at: string
  sprint_name: string
  sprint_starts_at: string
  sprint_ends_at: string
  project_id: string
  project_name: string
  organization_id: string
}

export default class ListPendingSprintReviewPackagesQuery {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async handle(input: { page?: unknown; perPage?: unknown } = {}): Promise<{
    data: PendingSprintReviewPackageRecord[]
    meta: ReturnType<typeof buildPaginationMeta>
  }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const pagination = normalizePagination(input, REVIEW_PAGINATION, { perPage: 10 })
    const query = db
      .from('sprint_review_packages as srp')
      .innerJoin('project_sprints as ps', 'ps.id', 'srp.sprint_id')
      .joinRaw('inner join projects as p on p.id::text = ps.project_id')
      .where('srp.reviewer_id', userId)
      .where('srp.status', 'pending')
      .where('ps.status', 'review_open')
      .whereNull('p.deleted_at')
      .orderBy('ps.ends_at', 'desc')
      .select(
        'srp.id',
        'srp.sprint_id',
        'srp.reviewer_id',
        'srp.status',
        'srp.created_at',
        'srp.updated_at',
        'ps.name as sprint_name',
        'ps.starts_at as sprint_starts_at',
        'ps.ends_at as sprint_ends_at',
        'p.id as project_id',
        'p.name as project_name',
        'ps.organization_id'
      )

    const totalRow = (await query.clone().clearSelect().clearOrder().count('* as total').first()) as
      | { total?: string | number }
      | undefined
    const total = Number(totalRow?.total ?? 0)
    const data = (await query
      .offset(toOffset(pagination.page, pagination.perPage))
      .limit(pagination.perPage)) as PendingSprintReviewPackageRecord[]

    return {
      data,
      meta: buildPaginationMeta(total, pagination),
    }
  }
}
