import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type {
  SprintRepository,
  SprintTransaction,
  SprintTransactionRunner,
} from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanManageProjectSprints } from '#modules/sprints/domain/project_sprint_access_policy'
import {
  buildProjectSprintUpdateAttributes,
} from '#modules/sprints/domain/project_sprint_policy'
import type {
  ProjectSprintRecord,
  UpdateProjectSprintDTO,
} from '#modules/sprints/public_contracts/sprint_public_api'

export type { UpdateProjectSprintDTO } from '#modules/sprints/public_contracts/sprint_public_api'

export default class UpdateProjectSprintCommand {
  constructor(
    private readonly execCtx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies,
    private readonly sprints: SprintRepository,
    private readonly transactions: SprintTransactionRunner
  ) {}

  async execute(dto: UpdateProjectSprintDTO): Promise<ProjectSprintRecord> {
    return this.transactions.run(async (trx) => {
      await this.assertManagementAccess(dto.project_id, trx)
      const sprint = await this.lockSprint(dto, trx)
      const attributes = buildProjectSprintUpdateAttributes(dto, sprint)
      const updated = await this.sprints.update(sprint.id, attributes, trx)
      if (!updated) {
        throw new InvariantViolationException(
          'Locked project sprint update returned no persisted row',
          {
            details: {
              sprintId: sprint.id,
            },
          }
        )
      }
      return updated
    })
  }

  private async assertManagementAccess(
    projectId: string,
    trx: SprintTransaction
  ): Promise<void> {
    const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
      this.execCtx,
      projectId,
      trx
    )
    assertCanManageProjectSprints(access)
  }

  private async lockSprint(
    dto: UpdateProjectSprintDTO,
    trx: SprintTransaction
  ): Promise<ProjectSprintRecord> {
    const sprint = await this.sprints.findForUpdate(dto.project_id, dto.sprint_id, trx)

    if (!sprint) {
      throw new NotFoundException('Project sprint not found')
    }
    return sprint
  }
}
