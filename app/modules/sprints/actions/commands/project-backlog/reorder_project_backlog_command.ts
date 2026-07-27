import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BaseCommand } from '#modules/sprints/actions/base_command'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintRepository, SprintTransactionRunner } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanManageProjectSprints } from '#modules/sprints/domain/project-sprint/project_sprint_access_policy'
import type {
  ReorderProjectBacklogDTO,
  SprintTaskAssignmentRecord,
} from '#modules/sprints/public_contracts/sprint_public_api'

export type { ReorderProjectBacklogDTO } from '#modules/sprints/public_contracts/sprint_public_api'

export default class ReorderProjectBacklogCommand extends BaseCommand<ReorderProjectBacklogDTO, SprintTaskAssignmentRecord> {
  constructor(
    private readonly ctx: SprintActionContext,
    private readonly dependencies: SprintExternalDependencies,
    private readonly sprints: SprintRepository,
    private readonly transactions: SprintTransactionRunner
  ) {
    super()
  }

  async execute(dto: ReorderProjectBacklogDTO): Promise<SprintTaskAssignmentRecord> {
    return this.transactions.run(async (trx) => {
      const access = await this.dependencies.projectAccess.resolveProjectSprintAccess(this.ctx, dto.project_id, trx)
      assertCanManageProjectSprints(access)
      if (dto.before_task_id && dto.after_task_id) throw ValidationException.field('placement', 'Choose before_task_id or after_task_id, not both')
      const task = await this.sprints.findTaskForUpdate(dto.project_id, dto.task_id, trx)
      if (!task) throw new NotFoundException('Task not found')
      if (task.project_sprint_id !== null) throw ValidationException.field('task_id', 'Only backlog tasks can be reordered')
      for (const referenceId of [dto.before_task_id, dto.after_task_id]) {
        if (!referenceId) continue
        const reference = await this.sprints.findTaskForUpdate(dto.project_id, referenceId, trx)
        if (!reference || reference.project_sprint_id !== null) throw ValidationException.field('placement', 'Backlog placement reference is invalid')
      }
      await this.sprints.reorderBacklog(dto, trx)
      return {
        id: task.id,
        project_id: task.project_id ?? dto.project_id,
        project_sprint_id: null,
        updated_at: new Date().toISOString(),
      }
    })
  }
}
