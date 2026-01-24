import type {
  MarketplaceApplicationExecutionContext,
  SubmittedMarketplaceApplication,
  SubmitMarketplaceApplicationInput,
} from '#modules/marketplace/actions/dtos/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/task_application_flow_port'

/**
 * Marketplace-owned apply command.
 *
 * Delegates through the Marketplace-owned application port. The outer composition adapter keeps
 * Tasks responsible for application policy and persistence.
 */
export class ApplyMarketplaceTaskCommand {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {}

  public handle(
    input: SubmitMarketplaceApplicationInput
  ): Promise<SubmittedMarketplaceApplication> {
    return this.flow.submit(this.execCtx, input)
  }
}
