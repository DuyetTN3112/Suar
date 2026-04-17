import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintRepository } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanManageProjectSprints } from '#modules/sprints/domain/project_sprint_access_policy'
import {
  assertCreateProjectSprintStatus,
  normalizeProjectSprintGoal,
  normalizeProjectSprintName,
  parseProjectSprintSchedule,
} from '#modules/sprints/domain/project_sprint_policy'
import type {
  CreateProjectSprintDTO,
  ProjectSprintRecord,
} from '#modules/sprints/public_contracts/sprint_public_api'

export type { CreateProjectSprintDTO } from '#modules/sprints/public_contracts/sprint_public_api'

export default class CreateProjectSprintCommand {
  constructor(
    private readonly execCtx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies,
    private readonly sprints: SprintRepository
  ) {}

  async execute(dto: CreateProjectSprintDTO): Promise<ProjectSprintRecord> {
    const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
      this.execCtx,
      dto.project_id
    )
    assertCanManageProjectSprints(access)

    const name = normalizeProjectSprintName(dto.name)
    const { startsAt, endsAt } = parseProjectSprintSchedule(dto.starts_at, dto.ends_at)
    assertCreateProjectSprintStatus(dto.status)

    const created = await this.sprints.create({
      organization_id: access.project.organization_id,
      project_id: access.project.id,
      name,
      goal: normalizeProjectSprintGoal(dto.goal),
      status: dto.status ?? 'draft',
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      created_by: access.actorId,
    })
    if (!created) {
      throw new InvariantViolationException('Project sprint insert returned no persisted row', {
        details: {
          projectId: dto.project_id,
        },
      })
    }

    return created
  }
}
