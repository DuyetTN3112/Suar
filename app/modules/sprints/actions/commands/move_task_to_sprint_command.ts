import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type {
  SprintRepository,
  SprintTaskRecord,
  SprintTransaction,
  SprintTransactionRunner,
} from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanManageProjectSprints } from '#modules/sprints/domain/project_sprint_access_policy'
import { canAttachTaskToSprint } from '#modules/sprints/domain/sprint_core_rules'
import type {
  MoveTaskToSprintDTO,
  SprintTaskAssignmentRecord,
} from '#modules/sprints/public_contracts/sprint_public_api'

export type { MoveTaskToSprintDTO } from '#modules/sprints/public_contracts/sprint_public_api'

export default class MoveTaskToSprintCommand {
  constructor(
    private readonly ctx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies,
    private readonly sprints: SprintRepository,
    private readonly transactions: SprintTransactionRunner
  ) {}

  async execute(dto: MoveTaskToSprintDTO): Promise<SprintTaskAssignmentRecord> {
    return this.transactions.run((trx) => this.moveTaskWithinTransaction(dto, trx))
  }

  private async moveTaskWithinTransaction(
    dto: MoveTaskToSprintDTO,
    trx: SprintTransaction
  ): Promise<SprintTaskAssignmentRecord> {
    await this.assertManagementAccess(dto.project_id, trx)
    const task = await this.lockTask(dto, trx)
    await this.assertSprintAssignmentAllowed(task, dto.project_sprint_id, trx)
    return this.persistSprintAssignment(task.id, dto.project_sprint_id, trx)
  }

  private async assertManagementAccess(
    projectId: string,
    trx: SprintTransaction
  ): Promise<void> {
    const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
      this.ctx,
      projectId,
      trx
    )
    assertCanManageProjectSprints(access)
  }

  private async lockTask(
    dto: MoveTaskToSprintDTO,
    trx: SprintTransaction
  ): Promise<SprintTaskRecord> {
    const task = await this.sprints.findTaskForUpdate(dto.project_id, dto.task_id, trx)

    if (!task) {
      throw new NotFoundException('Task not found')
    }
    return task
  }

  private async assertSprintAssignmentAllowed(
    task: SprintTaskRecord,
    sprintId: string | null,
    trx: SprintTransaction
  ): Promise<void> {
    if (sprintId === null) {
      return
    }

    const sprint = await this.findSprint(sprintId, trx)
    const decision = canAttachTaskToSprint({
      taskProjectId: task.project_id,
      sprintProjectId: sprint.project_id,
      sprintStatus: sprint.status,
    })
    if (!decision.allowed) {
      throw new BusinessLogicException(decision.reason ?? 'Task cannot be attached to sprint')
    }
  }

  private async findSprint(sprintId: string, trx: SprintTransaction) {
    const sprint = await this.sprints.findCore(sprintId, trx)

    if (!sprint) {
      throw new NotFoundException('Project sprint not found')
    }
    return sprint
  }

  private async persistSprintAssignment(
    taskId: string,
    sprintId: string | null,
    trx: SprintTransaction
  ): Promise<SprintTaskAssignmentRecord> {
    const updated = await this.sprints.assignTask(taskId, sprintId, trx)

    if (!updated) {
      throw new InvariantViolationException(
        'Locked task sprint assignment returned no persisted row',
        {
          details: {
            taskId,
          },
        }
      )
    }
    return updated
  }
}
