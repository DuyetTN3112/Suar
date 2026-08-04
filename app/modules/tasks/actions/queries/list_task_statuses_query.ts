import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

export default class ListTaskStatusesQuery {
  constructor(private readonly repository: Pick<TaskStatusQueryRepositoryPort, 'findByOrganization'>) {}

  async execute(organizationId: string): Promise<TaskStatusRecord[]> {
    return this.repository.findByOrganization(organizationId)
  }
}
