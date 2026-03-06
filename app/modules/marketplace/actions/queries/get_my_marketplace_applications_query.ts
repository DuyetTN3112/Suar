import {
  listMyApplicationsViaTaskApplications,
  type GetMyApplicationsInput,
  type MyApplicationsResult,
  type TaskApplicationFlowContext,
} from '#modules/tasks/public_contracts/task_application_flow'

/**
 * Marketplace-owned applicant proposal tracker query facade.
 */
export class GetMyMarketplaceApplicationsQuery {
  constructor(private readonly execCtx: TaskApplicationFlowContext) {}

  public handle(input: GetMyApplicationsInput): Promise<MyApplicationsResult> {
    return listMyApplicationsViaTaskApplications(this.execCtx, input)
  }
}
