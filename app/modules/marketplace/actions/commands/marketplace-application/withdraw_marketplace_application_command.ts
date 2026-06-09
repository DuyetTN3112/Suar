import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseCommand } from '#modules/marketplace/actions/base_command'
import type {
  MarketplaceApplicationExecutionContext,
  WithdrawMarketplaceApplicationInput,
} from '#modules/marketplace/actions/dtos/marketplace-application/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/marketplace-application/task_application_flow_port'

/**
 * Marketplace-owned proposal withdrawal command.
 *
 * Delegates through the Marketplace-owned application port while Tasks retains application
 * persistence.
 */
export class WithdrawMarketplaceApplicationCommand extends BaseCommand<
  WithdrawMarketplaceApplicationInput,
  Result<void, AppException>
> {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {
    super()
  }

  public override handle(input: WithdrawMarketplaceApplicationInput): Promise<Result<void, AppException>> {
    return this.flow.withdraw(this.execCtx, input)
  }
}
