import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/marketplace/actions/base_query'
import type {
  MarketplaceApplicationExecutionContext,
  MarketplaceApplicationScore,
  ScoreMarketplaceApplicationInput,
} from '#modules/marketplace/actions/dtos/marketplace-application/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/marketplace-application/task_application_flow_port'

/**
 * Marketplace-owned applicant match score query facade.
 */
export class GetMarketplaceApplicationMatchScoreQuery extends BaseQuery<
  ScoreMarketplaceApplicationInput,
  Result<MarketplaceApplicationScore, AppException>
> {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {
    super()
  }

  public handle(
    input: ScoreMarketplaceApplicationInput
  ): Promise<Result<MarketplaceApplicationScore, AppException>> {
    return this.flow.score(this.execCtx, input)
  }
}
