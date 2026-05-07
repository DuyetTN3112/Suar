import { ProjectSprintAccessReaderAdapter } from '#composition/adapters/projects/project_sprint_access_reader_adapter'
import { canAttachTaskToSprint } from '#modules/sprints/domain/project-sprint/sprint_core_rules'
import { PostgresSprintRepository } from '#modules/sprints/infra/repositories/project-sprint/postgres_sprint_repository'
import type { TaskSprintReader } from '#modules/tasks/actions/ports/outbound/task_sprint_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

export class TaskSprintReaderAdapter implements TaskSprintReader {
  private readonly sprints = new PostgresSprintRepository()
  private readonly access = new ProjectSprintAccessReaderAdapter()

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

  async validateAssignment(input: {
    context: { userId: string | null; organizationId: string | null; ip: string; userAgent: string }
    organizationId: string
    projectId: string
    sprintId: string | null
    transaction: TaskTransaction
  }) {
    const access = await this.access.resolveProjectSprintAccess(input.context, input.projectId, input.transaction)
    if (!access.canManageSprint) return { allowed: false, reason: 'Actor cannot manage project sprint' }
    if (input.sprintId === null) return { allowed: true }
    const sprint = await this.sprints.findCore(input.sprintId, input.transaction)
    if (!sprint) return { allowed: false, reason: 'Project sprint not found' }
    const decision = canAttachTaskToSprint({
      taskProjectId: input.projectId,
      sprintProjectId: sprint.project_id,
      sprintStatus: sprint.status,
    })
    if (!decision.allowed) return { allowed: false, reason: decision.reason ?? 'Task cannot be attached to sprint' }
    return { allowed: true, sprintStatus: sprint.status as 'draft' | 'active' }
  }

  async recordInitialAssignment(input: {
    organizationId: string
    projectId: string
    taskId: string
    sprintId: string | null
    entryReason: 'created_in_backlog' | 'planned' | 'scope_change' | 'carry_over' | 'restored'
    addedAfterStart: boolean
    actorId: string | null
  }, transaction: TaskTransaction): Promise<void> {
    await this.sprints.recordInitialAssignment({
      organization_id: input.organizationId,
      project_id: input.projectId,
      task_id: input.taskId,
      sprint_id: input.sprintId,
      entry_reason: input.entryReason,
      added_after_start: input.addedAfterStart,
      actor_id: input.actorId,
    }, transaction)
  }

  async recordAssignmentTransition(input: Parameters<TaskSprintReader['recordAssignmentTransition']>[0], transaction: TaskTransaction): Promise<void> {
    await this.sprints.recordAssignmentTransition({
      organization_id: input.organizationId,
      project_id: input.projectId,
      task_id: input.taskId,
      previous_sprint_id: input.previousSprintId,
      next_sprint_id: input.nextSprintId,
      entry_reason: input.entryReason,
      exit_reason: input.exitReason,
      added_after_start: input.addedAfterStart,
      actor_id: input.actorId,
    }, transaction)
  }
}
