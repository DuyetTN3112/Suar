import type { AdminActionContext } from '#modules/admin/packages/actions/action_context'
import type { AdminSubscriptionRepository } from '#modules/admin/packages/actions/ports/outbound/packages/admin_operational_repository'
import { BaseQuery } from '#modules/admin/packages/actions/queries/packages/base_query'
import {
  SUBSCRIPTION_PACKAGE_CATALOG,
  SUBSCRIPTION_PAYMENT_CONFIG,
} from '#modules/admin/packages/constants/packages/subscription_packages'

export interface SubscriptionQrCatalogResult {
  paymentConfig: typeof SUBSCRIPTION_PAYMENT_CONFIG
  plans: typeof SUBSCRIPTION_PACKAGE_CATALOG
  stats: {
    total: number
    active: number
    expiringSoon: number
    cancelled: number
    byPlan: Record<string, number>
  }
}

export default class GetSubscriptionQrCatalogQuery extends BaseQuery<
  Record<string, never>,
  SubscriptionQrCatalogResult
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly repo: AdminSubscriptionRepository
  ) {
    super(execCtx)
  }

  async handle(): Promise<SubscriptionQrCatalogResult> {
    const stats = await this.repo.getSubscriptionStats()

    return {
      paymentConfig: SUBSCRIPTION_PAYMENT_CONFIG,
      plans: SUBSCRIPTION_PACKAGE_CATALOG,
      stats,
    }
  }
}
