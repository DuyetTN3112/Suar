import {
  getApplicationMatchScoreViaTaskApplications,
  type ApplicationMatchScoreInput,
  type ApplicationMatchScoreResult,
  type TaskApplicationFlowContext,
} from '#modules/tasks/public_contracts/task_application_flow'

/**
 * Marketplace-owned applicant match score query facade.
 */
export class GetMarketplaceApplicationMatchScoreQuery {
  constructor(private readonly execCtx: TaskApplicationFlowContext) {}

  public handle(input: ApplicationMatchScoreInput): Promise<ApplicationMatchScoreResult> {
    return getApplicationMatchScoreViaTaskApplications(this.execCtx, input)
  }
}
