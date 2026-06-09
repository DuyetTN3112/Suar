import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseCommand } from '#modules/marketplace/actions/base_command'
import type {
  MarketplaceApplicationExecutionContext,
  SubmittedMarketplaceApplication,
  SubmitMarketplaceApplicationInput,
} from '#modules/marketplace/actions/dtos/marketplace-application/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/marketplace-application/task_application_flow_port'

/**
 * Marketplace-owned apply command.
 *
 * Delegates through the Marketplace-owned application port. The outer composition adapter keeps
 * Tasks responsible for application policy and persistence.
 */
export class ApplyMarketplaceTaskCommand extends BaseCommand<
  SubmitMarketplaceApplicationInput,
  Result<SubmittedMarketplaceApplication, AppException>
> {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {
    super()
  }

  public override handle(
    input: SubmitMarketplaceApplicationInput
  ): Promise<Result<SubmittedMarketplaceApplication, AppException>> {
    return this.flow.submit(this.execCtx, input)
  }
}
