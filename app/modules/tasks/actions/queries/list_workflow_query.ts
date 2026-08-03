import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { TaskWorkflowQueryRepository } from '#modules/tasks/actions/ports/outbound/task_workflow_query_repository'
import type { TaskWorkflowTransitionRecord } from '#modules/tasks/types/task_records'

export default class ListWorkflowQuery {
  constructor(private readonly repository: TaskWorkflowQueryRepository) {}

  async executeAndWrap(
    organizationId: string,
    projectId?: string | null
  ): Promise<Result<TaskWorkflowTransitionRecord[], AppException>> {
    try {
      return Result.ok(await this.execute(organizationId, projectId))
    } catch (error) {
      if (error instanceof AppException) {
        return Result.fail(error)
      }

      throw error
    }
  }

  async execute(
    organizationId: string,
    projectId?: string | null
  ): Promise<TaskWorkflowTransitionRecord[]> {
    return projectId
      ? await this.repository.findByProject?.(projectId, organizationId) ?? []
      : this.repository.findByOrganization(organizationId)
  }
}
