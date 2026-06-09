import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/marketplace/actions/base_query'
import type {
  MarketplaceApplicationExecutionContext,
  RankMarketplaceTaskApplicationsInput,
  RankedMarketplaceApplication,
} from '#modules/marketplace/actions/dtos/marketplace-application/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/marketplace-application/task_application_flow_port'

/**
 * Marketplace-owned proposal ranking query facade.
 */
export class GetMarketplaceTaskApplicationsRankingQuery extends BaseQuery<
  RankMarketplaceTaskApplicationsInput,
  Result<RankedMarketplaceApplication[], AppException>
> {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {
    super()
  }

  public handle(
    input: RankMarketplaceTaskApplicationsInput
  ): Promise<Result<RankedMarketplaceApplication[], AppException>> {
    return this.flow.rank(this.execCtx, input)
  }
}
