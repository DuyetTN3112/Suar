import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/marketplace/actions/base_query'
import type {
  ListMarketplaceTaskApplicationsInput,
  MarketplaceApplicationExecutionContext,
  MarketplaceApplicationForReview,
  MarketplaceApplicationPage,
} from '#modules/marketplace/actions/dtos/marketplace-application/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/marketplace-application/task_application_flow_port'

/**
 * Marketplace-owned proposal review list query facade.
 */
export class GetMarketplaceTaskApplicationsQuery extends BaseQuery<
  ListMarketplaceTaskApplicationsInput,
  Result<MarketplaceApplicationPage<MarketplaceApplicationForReview>, AppException>
> {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {
    super()
  }

  public handle(
    input: ListMarketplaceTaskApplicationsInput
  ): Promise<Result<MarketplaceApplicationPage<MarketplaceApplicationForReview>, AppException>> {
    return this.flow.listForTask(this.execCtx, input)
  }
}
