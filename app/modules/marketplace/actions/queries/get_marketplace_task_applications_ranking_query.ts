import {
  rankTaskApplicationsViaTaskApplications,
  type TaskApplicationFlowContext,
  type TaskApplicationsRankingInput,
  type TaskApplicationsRankingResult,
} from '#modules/tasks/public_contracts/task_application_flow'

/**
 * Marketplace-owned proposal ranking query facade.
 */
export class GetMarketplaceTaskApplicationsRankingQuery {
  constructor(private readonly execCtx: TaskApplicationFlowContext) {}

  public handle(input: TaskApplicationsRankingInput): Promise<TaskApplicationsRankingResult> {
    return rankTaskApplicationsViaTaskApplications(this.execCtx, input)
  }
}
