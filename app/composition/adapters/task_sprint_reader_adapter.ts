import { PostgresSprintRepository } from '#modules/sprints/infra/repositories/postgres_sprint_repository'
import type { TaskSprintReader } from '#modules/tasks/actions/ports/outbound/task_sprint_reader'

export class TaskSprintReaderAdapter implements TaskSprintReader {
  private readonly sprints = new PostgresSprintRepository()

  async findSprint(projectId: string, sprintId: string) {
    const sprint = await this.sprints.find(projectId, sprintId)
    return sprint ? { id: sprint.id, name: sprint.name } : null
  }

  async belongsToProject(
    sprintId: string,
    organizationId: string,
    projectId: string
  ): Promise<boolean> {
    const sprint = await this.sprints.find(projectId, sprintId)
    return Boolean(
      sprint &&
        sprint.project_id === projectId &&
        sprint.organization_id === organizationId
    )
  }
}
