import {
  listTaskApplicationsViaTaskApplications,
  type GetTaskApplicationsDTO,
  type TaskApplicationFlowContext,
  type TaskApplicationsResult,
} from '#modules/tasks/public_contracts/task_application_flow'

/**
 * Marketplace-owned proposal review list query facade.
 */
export class GetMarketplaceTaskApplicationsQuery {
  constructor(private readonly execCtx: TaskApplicationFlowContext) {}

  public handle(dto: GetTaskApplicationsDTO): Promise<TaskApplicationsResult> {
    return listTaskApplicationsViaTaskApplications(this.execCtx, dto)
  }
}
