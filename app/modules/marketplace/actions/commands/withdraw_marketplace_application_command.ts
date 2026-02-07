import type {
  MarketplaceApplicationExecutionContext,
  WithdrawMarketplaceApplicationInput,
} from '#modules/marketplace/actions/dtos/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/task_application_flow_port'

/**
 * Marketplace-owned proposal withdrawal command.
 *
 * Delegates through the Marketplace-owned application port while Tasks retains application
 * persistence.
 */
export class WithdrawMarketplaceApplicationCommand {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {}

  public async handle(input: WithdrawMarketplaceApplicationInput): Promise<void> {
    await this.flow.withdraw(this.execCtx, input)
  }
}
