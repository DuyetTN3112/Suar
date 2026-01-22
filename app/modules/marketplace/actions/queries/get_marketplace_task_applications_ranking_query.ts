import type {
  MarketplaceApplicationExecutionContext,
  RankMarketplaceTaskApplicationsInput,
  RankedMarketplaceApplication,
} from '#modules/marketplace/actions/dtos/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/task_application_flow_port'

/**
 * Marketplace-owned proposal ranking query facade.
 */
export class GetMarketplaceTaskApplicationsRankingQuery {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {}

  public handle(
    input: RankMarketplaceTaskApplicationsInput
  ): Promise<RankedMarketplaceApplication[]> {
    return this.flow.rank(this.execCtx, input)
  }
}
