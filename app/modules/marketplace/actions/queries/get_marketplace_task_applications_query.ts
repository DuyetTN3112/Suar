import type {
  ListMarketplaceTaskApplicationsInput,
  MarketplaceApplicationExecutionContext,
  MarketplaceApplicationForReview,
  MarketplaceApplicationPage,
} from '#modules/marketplace/actions/dtos/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/task_application_flow_port'

/**
 * Marketplace-owned proposal review list query facade.
 */
export class GetMarketplaceTaskApplicationsQuery {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {}

  public handle(
    input: ListMarketplaceTaskApplicationsInput
  ): Promise<MarketplaceApplicationPage<MarketplaceApplicationForReview>> {
    return this.flow.listForTask(this.execCtx, input)
  }
}
