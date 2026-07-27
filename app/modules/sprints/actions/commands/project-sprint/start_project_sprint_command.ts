import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/sprints/actions/base_command'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintRepository, SprintTransactionRunner } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { canStartProjectSprint } from '#modules/sprints/domain/project-backlog/product_backlog_rules'
import { assertCanManageProjectSprints } from '#modules/sprints/domain/project-sprint/project_sprint_access_policy'
import type { ProjectSprintRecord } from '#modules/sprints/public_contracts/sprint_public_api'

export interface StartProjectSprintDTO {
  project_id: string
  sprint_id: string
}

export default class StartProjectSprintCommand extends BaseCommand<StartProjectSprintDTO, ProjectSprintRecord> {
  constructor(
    private readonly ctx: SprintActionContext,
    private readonly dependencies: SprintExternalDependencies,
    private readonly sprints: SprintRepository,
    private readonly transactions: SprintTransactionRunner
  ) {
    super()
  }

  async execute(dto: StartProjectSprintDTO): Promise<ProjectSprintRecord> {
    return this.transactions.run(async (trx) => {
      const access = await this.dependencies.projectAccess.resolveProjectSprintAccess(this.ctx, dto.project_id, trx)
      assertCanManageProjectSprints(access)
      await this.sprints.lockProjectPlanning(dto.project_id, trx)
      const sprint = await this.sprints.findForUpdate(dto.project_id, dto.sprint_id, trx)
      if (!sprint) throw new NotFoundException('Project sprint not found')
      const decision = canStartProjectSprint({
        currentStatus: sprint.status,
        activeSprintCount: await this.sprints.countActive(dto.project_id, trx),
        actorCanManageSprint: true,
        startsAt: new Date(sprint.starts_at),
        endsAt: new Date(sprint.ends_at),
      })
      if (!decision.allowed) {
        throw new ConflictException(decision.reason ?? 'Project sprint cannot be started')
      }
      const updated = await this.sprints.update(sprint.id, { status: 'active' }, trx)
      if (!updated) throw new InvariantViolationException('Project sprint start returned no persisted row')
      await this.sprints.initializeSprintTaskAssignments(dto.project_id, sprint.id, this.ctx.userId, trx)
      return updated
    })
  }
}
