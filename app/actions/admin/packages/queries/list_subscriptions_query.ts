import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import AdminSubscriptionRepository from '#infra/admin/repositories/admin_subscription_repository'
import {
  toDisplaySubscriptionPlan,
  toStorageSubscriptionPlan,
} from '#domain/users/subscription_rules'

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
  subscriptions: Array<{
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
  }>
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
    execCtx: ExecutionContext,
    private repo = new AdminSubscriptionRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: ListSubscriptionsDTO): Promise<ListSubscriptionsResult> {
    const page = dto.page || 1
    const perPage = dto.perPage || 20

    const [stats, result] = await Promise.all([
      this.repo.getSubscriptionStats(),
      this.repo.listSubscriptions(
        { search: dto.search, plan: toStorageSubscriptionPlan(dto.plan), status: dto.status },
        page,
        perPage
      ),
    ])

    return {
      stats: {
        ...stats,
        byPlan: {
          ...stats.byPlan,
          promax: stats.byPlan.enterprise ?? 0,
        },
      },
      subscriptions: result.subscriptions.map((subscription) => ({
        ...subscription,
        plan: toDisplaySubscriptionPlan(subscription.plan),
      })),
      meta: {
        total: result.total,
        perPage,
        currentPage: page,
        lastPage: Math.max(1, Math.ceil(result.total / perPage)),
      },
    }
  }
}
