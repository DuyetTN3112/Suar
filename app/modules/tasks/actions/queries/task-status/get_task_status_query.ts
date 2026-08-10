import AppException from '#modules/errors/public_contracts/application_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

export default class GetTaskStatusQuery {
  constructor(private readonly statuses: TaskStatusQueryRepositoryPort) {}

  async execute(statusId: string, organizationId: string) {
    const status = await this.statuses.findByIdAndOrgActive(statusId, organizationId)
    if (!status) {
      throw NotFoundException.resource('Task status', statusId)
    }
    return status
  }

  async executeAndWrap(
    statusId: string,
    organizationId: string
  ): Promise<Result<TaskStatusRecord, AppException>> {
    try {
      return Result.ok(await this.execute(statusId, organizationId))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
