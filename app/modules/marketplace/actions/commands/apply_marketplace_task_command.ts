import {
  applyForTaskViaTaskApplications,
  type ApplyForTaskDTO,
  type ApplyForTaskResult,
  type TaskApplicationFlowContext,
} from '#modules/tasks/public_contracts/task_application_flow'

/**
 * Marketplace-owned apply command.
 *
 * Phase 1 delegates to the existing task command so runtime storage remains `task_applications`
 * while marketplace takes route/controller ownership.
 */
export class ApplyMarketplaceTaskCommand {
  constructor(private readonly execCtx: TaskApplicationFlowContext) {}

  public handle(dto: ApplyForTaskDTO): Promise<ApplyForTaskResult> {
    return applyForTaskViaTaskApplications(this.execCtx, dto)
  }
}
