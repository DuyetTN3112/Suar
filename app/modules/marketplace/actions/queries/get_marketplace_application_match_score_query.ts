import type {
  MarketplaceApplicationExecutionContext,
  MarketplaceApplicationScore,
  ScoreMarketplaceApplicationInput,
} from '#modules/marketplace/actions/dtos/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/task_application_flow_port'

/**
 * Marketplace-owned applicant match score query facade.
 */
export class GetMarketplaceApplicationMatchScoreQuery {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {}

  public handle(input: ScoreMarketplaceApplicationInput): Promise<MarketplaceApplicationScore> {
    return this.flow.score(this.execCtx, input)
  }
}
