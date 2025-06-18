import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import OrganizationBillingRepository from '#infra/organization/repositories/organization_billing_repository'

/**
 * GetBillingInfoQuery
 *
 * Query to get organization billing and subscription information.
 */

export type GetBillingInfoDTO = Record<string, never>

export interface GetBillingInfoResult {
  subscription: {
    plan: 'free' | 'pro' | 'pro_max'
    status: 'active' | 'cancelled' | 'past_due'
    current_period_end: string | null
    cancel_at_period_end: boolean
  }
  plans: Array<{
    id: string
    name: string
    price: number
    features: string[]
    popular?: boolean
  }>
}

export default class GetBillingInfoQuery extends BaseQuery<
  GetBillingInfoDTO,
  GetBillingInfoResult
> {
  constructor(
    execCtx: ExecutionContext,
    private billingRepo = new OrganizationBillingRepository()
  ) {
    super(execCtx)
  }

  async handle(_dto: GetBillingInfoDTO): Promise<GetBillingInfoResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('Organization context required')
    }

    // Fetch from repository
    const subscription = await this.billingRepo.getSubscription(organizationId)
    const plans = this.billingRepo.getAvailablePlans()

    return {
      subscription,
      plans,
    }
  }
}
