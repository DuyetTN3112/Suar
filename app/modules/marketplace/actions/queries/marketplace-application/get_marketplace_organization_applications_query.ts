import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/marketplace/actions/base_query'
import type {
  ListOrganizationMarketplaceApplicationsInput,
  MarketplaceApplicationExecutionContext,
  MarketplaceApplicationForReview,
  MarketplaceApplicationPage,
} from '#modules/marketplace/actions/dtos/marketplace-application/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/marketplace-application/task_application_flow_port'

export class GetMarketplaceOrganizationApplicationsQuery extends BaseQuery<
  ListOrganizationMarketplaceApplicationsInput,
  Result<MarketplaceApplicationPage<MarketplaceApplicationForReview>, AppException>
> {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {
    super()
  }

  public handle(
    input: ListOrganizationMarketplaceApplicationsInput
  ): Promise<Result<MarketplaceApplicationPage<MarketplaceApplicationForReview>, AppException>> {
    return this.flow.listForOrganization(this.execCtx, input)
  }
}
