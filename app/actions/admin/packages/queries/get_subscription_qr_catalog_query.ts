import { BaseQuery } from '#actions/admin/base_query'
import { AdminSubscriptionReadOps } from '#infra/admin/repositories/read/admin_subscription_queries'
import {
  SUBSCRIPTION_PACKAGE_CATALOG,
  SUBSCRIPTION_PAYMENT_CONFIG,
} from '#modules/admin/constants/subscription_packages'
import type { ExecutionContext } from '#types/execution_context'

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
    execCtx: ExecutionContext,
    private repo = AdminSubscriptionReadOps
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
