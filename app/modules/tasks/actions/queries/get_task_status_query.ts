import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'

export default class GetTaskStatusQuery {
  constructor(private readonly statuses: TaskStatusQueryRepositoryPort) {}

  async execute(statusId: string, organizationId: string) {
    const status = await this.statuses.findByIdAndOrgActive(statusId, organizationId)
    if (!status) {
      throw NotFoundException.resource('Task status', statusId)
    }
    return status
  }
}
