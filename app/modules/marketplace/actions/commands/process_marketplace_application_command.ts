import type {
  DecideMarketplaceApplicationInput,
  MarketplaceApplicationExecutionContext,
} from '#modules/marketplace/actions/dtos/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/task_application_flow_port'

/**
 * Marketplace-owned proposal decision command.
 *
 * Delegates through the Marketplace-owned application port while Tasks retains decision and
 * assignment policy.
 */
export class ProcessMarketplaceApplicationCommand {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {}

  public async handle(input: DecideMarketplaceApplicationInput): Promise<void> {
    await this.flow.decide(this.execCtx, input)
  }
}
