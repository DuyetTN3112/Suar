import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BaseCommand } from '#modules/sprints/actions/base_command'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintRepository, SprintTransactionRunner } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { classifySprintTaskOutcome } from '#modules/sprints/domain/project-backlog/product_backlog_rules'
import { assertCanManageProjectSprints } from '#modules/sprints/domain/project-sprint/project_sprint_access_policy'
import type {
  EndProjectSprintDeliveryDTO,
  ProjectSprintRecord,
} from '#modules/sprints/public_contracts/sprint_public_api'

export interface EndProjectSprintDeliveryResult {
  sprint: ProjectSprintRecord
  historical_task_ids: string[]
  moved_to_backlog_ids: string[]
  moved_to_sprint_ids: string[]
}

export default class EndProjectSprintDeliveryCommand extends BaseCommand<EndProjectSprintDeliveryDTO, EndProjectSprintDeliveryResult> {
  constructor(
    private readonly ctx: SprintActionContext,
    private readonly dependencies: SprintExternalDependencies,
    private readonly sprints: SprintRepository,
    private readonly transactions: SprintTransactionRunner
  ) {
    super()
  }

  async execute(dto: EndProjectSprintDeliveryDTO): Promise<EndProjectSprintDeliveryResult> {
    return this.transactions.run(async (trx) => {
      const access = await this.dependencies.projectAccess.resolveProjectSprintAccess(this.ctx, dto.project_id, trx)
      assertCanManageProjectSprints(access)
      await this.sprints.lockProjectPlanning(dto.project_id, trx)
      const sprint = await this.sprints.findForUpdate(dto.project_id, dto.sprint_id, trx)
      if (!sprint) throw new NotFoundException('Project sprint not found')
      if (sprint.status !== 'active') throw new ConflictException('Project sprint delivery has already ended')
      const tasks = await this.sprints.findSprintTasksForUpdate(dto.project_id, dto.sprint_id, trx)
      const destinations = new Map(dto.incomplete_tasks.map((item) => [item.task_id, item.destination]))
      const historicalTaskIds: string[] = []
      const movedToBacklogIds: string[] = []
      const movedToSprintIds: string[] = []

      for (const task of tasks) {
        const outcome = classifySprintTaskOutcome({ statusCategory: task.status })
        if (outcome !== 'requires_destination') {
          historicalTaskIds.push(task.id)
          continue
        }
        const destination = destinations.get(task.id)
        if (!destination) throw ValidationException.field('incomplete_tasks', `Destination required for task ${task.id}`)
        const nextSprintId = destination.kind === 'sprint' ? destination.sprint_id : null
        if (nextSprintId === dto.sprint_id) throw ValidationException.field('incomplete_tasks', 'A task cannot carry over to the same sprint')
        if (nextSprintId) {
          const nextSprint = await this.sprints.findCore(nextSprintId, trx)
          if (!nextSprint || nextSprint.project_id !== dto.project_id || !['draft', 'active'].includes(nextSprint.status)) {
            throw ValidationException.field('incomplete_tasks', 'Destination sprint is invalid')
          }
        }
        await this.sprints.assignTask(task.id, nextSprintId, trx)
        await this.sprints.recordAssignmentTransition({
          organization_id: task.organization_id,
          project_id: dto.project_id,
          task_id: task.id,
          previous_sprint_id: dto.sprint_id,
          next_sprint_id: nextSprintId,
          entry_reason: 'carry_over',
          exit_reason: 'delivery_completed',
          added_after_start: false,
          actor_id: this.ctx.userId,
        }, trx)
        if (nextSprintId) movedToSprintIds.push(task.id)
        else movedToBacklogIds.push(task.id)
      }

      return { sprint: { ...sprint, status: 'active' }, historical_task_ids: historicalTaskIds, moved_to_backlog_ids: movedToBacklogIds, moved_to_sprint_ids: movedToSprintIds }
    })
  }
}
