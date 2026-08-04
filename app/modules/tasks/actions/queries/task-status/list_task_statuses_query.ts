import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

/**
 * Query: List all active task statuses for an organization.
 */
export default class ListTaskStatusesQuery {
  constructor(
    private readonly repository: Pick<
      TaskStatusQueryRepositoryPort,
      'findByOrganization' | 'findByProject'
    >
  ) {}

  async execute(organizationId: string, projectId?: string | null): Promise<TaskStatusRecord[]> {
    return projectId
      ? await this.repository.findByProject?.(projectId, organizationId) ?? []
      : this.repository.findByOrganization(organizationId)
  }

  async executeAndWrap(
    organizationId: string,
    projectId?: string | null
  ): Promise<Result<TaskStatusRecord[], AppException>> {
    try {
      return Result.ok(await this.execute(organizationId, projectId))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
