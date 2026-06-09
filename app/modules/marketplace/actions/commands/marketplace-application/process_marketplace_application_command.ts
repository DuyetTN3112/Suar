import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseCommand } from '#modules/marketplace/actions/base_command'
import type {
  DecideMarketplaceApplicationInput,
  MarketplaceApplicationExecutionContext,
} from '#modules/marketplace/actions/dtos/marketplace-application/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/marketplace-application/task_application_flow_port'

/**
 * Marketplace-owned proposal decision command.
 *
 * Delegates through the Marketplace-owned application port while Tasks retains decision and
 * assignment policy.
 */
export class ProcessMarketplaceApplicationCommand extends BaseCommand<
  DecideMarketplaceApplicationInput,
  Result<void, AppException>
> {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {
    super()
  }

  public override handle(input: DecideMarketplaceApplicationInput): Promise<Result<void, AppException>> {
    return this.flow.decide(this.execCtx, input)
  }
}
