import {
  processTaskApplicationViaTaskApplications,
  type ProcessApplicationDTO,
  type TaskApplicationFlowContext,
} from '#modules/tasks/public_contracts/task_application_flow'

/**
 * Marketplace-owned proposal decision command.
 *
 * Phase 1 delegates to tasks storage/assignment rules while marketplace owns the route boundary.
 */
export class ProcessMarketplaceApplicationCommand {
  constructor(private readonly execCtx: TaskApplicationFlowContext) {}

  public async handle(dto: ProcessApplicationDTO): Promise<void> {
    await processTaskApplicationViaTaskApplications(this.execCtx, dto)
  }
}
