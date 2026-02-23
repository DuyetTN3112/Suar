import type { AdminActionContext } from '#modules/admin/packages/actions/action_context'
import { ADMIN_PAGINATION } from '#modules/admin/packages/actions/dtos/common/admin_pagination'
import type { AdminSubscriptionRepository } from '#modules/admin/packages/actions/ports/outbound/admin_operational_repository'
import { BaseQuery } from '#modules/admin/packages/actions/query/base_query'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import {
  toDisplaySubscriptionPlan,
  toStorageSubscriptionPlan,
} from '#modules/users/public_contracts/subscription_rules'

export interface ListSubscriptionsDTO {
  page?: number
  perPage?: number
  search?: string
  plan?: string
  status?: string
}

export interface ListSubscriptionsResult {
  stats: {
    total: number
    active: number
    expiringSoon: number
    cancelled: number
    byPlan: Record<string, number>
  }
  subscriptions: {
    id: string
    user_id: string
    username: string
    email: string | null
    system_role: string
    plan: string
    status: string
    started_at: string | null
    expires_at: string | null
    auto_renew: boolean
    created_at: string | null
    updated_at: string | null
  }[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export default class ListSubscriptionsQuery extends BaseQuery<
  ListSubscriptionsDTO,
  ListSubscriptionsResult
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly repo: AdminSubscriptionRepository
  ) {
    super(execCtx)
  }

  async handle(dto: ListSubscriptionsDTO): Promise<ListSubscriptionsResult> {
    const pagination = normalizePagination(dto, ADMIN_PAGINATION)
    const plan = toStorageSubscriptionPlan(dto.plan)

    const [stats, result] = await Promise.all([
      this.repo.getSubscriptionStats(),
      this.repo.listSubscriptions(
        {
          ...(dto.search ? { search: dto.search } : {}),
          ...(plan ? { plan } : {}),
          ...(dto.status ? { status: dto.status } : {}),
        },
        pagination.page,
        pagination.perPage
      ),
    ])
    const meta = buildPaginationMeta(result.total, pagination)

    return {
      stats: {
        ...stats,
        byPlan: {
          ...stats.byPlan,
          promax: stats.byPlan['enterprise'] ?? 0,
        },
      },
      subscriptions: result.subscriptions.map((subscription) => ({
        ...subscription,
        plan: toDisplaySubscriptionPlan(subscription.plan),
      })),
      meta: {
        total: meta.total,
        perPage: meta.perPage,
        currentPage: meta.currentPage,
        lastPage: meta.lastPage,
      },
    }
  }
}
