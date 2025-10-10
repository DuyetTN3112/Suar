import {
  withdrawTaskApplicationViaTaskApplications,
  type TaskApplicationFlowContext,
  type WithdrawApplicationDTO,
} from '#modules/tasks/public_contracts/task_application_flow'

/**
 * Marketplace-owned proposal withdrawal command.
 *
 * Phase 1 delegates to tasks storage while keeping applicant flow outside org workspace.
 */
export class WithdrawMarketplaceApplicationCommand {
  constructor(private readonly execCtx: TaskApplicationFlowContext) {}

  public async handle(dto: WithdrawApplicationDTO): Promise<void> {
    await withdrawTaskApplicationViaTaskApplications(this.execCtx, dto)
  }
}
