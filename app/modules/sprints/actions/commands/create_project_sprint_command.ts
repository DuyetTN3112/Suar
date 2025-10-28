import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/sprint_external_dependencies'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanManageProjectSprints } from '#modules/sprints/actions/support/project_sprint_access'
import { sprintExternalDeps } from '#modules/sprints/bootstrap/sprint_composition_root'
import type { ProjectSprintCoreStatus } from '#modules/sprints/domain/sprint_core_rules'
import type { ProjectSprintRecord } from '#modules/sprints/types/project_sprint_records'

export interface CreateProjectSprintDTO {
  project_id: string
  name: string
  goal?: string | null
  starts_at: string
  ends_at: string
  status?: ProjectSprintCoreStatus
}

export default class CreateProjectSprintCommand {
  constructor(
    private readonly execCtx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies = sprintExternalDeps
  ) {}

  async execute(dto: CreateProjectSprintDTO): Promise<ProjectSprintRecord> {
    const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
      this.execCtx,
      dto.project_id
    )
    assertCanManageProjectSprints(access)

    const name = dto.name.trim()
    if (!name) {
      throw new BusinessLogicException('Project sprint name is required')
    }

    const startsAt = this.parseDateTime(dto.starts_at, 'starts_at')
    const endsAt = this.parseDateTime(dto.ends_at, 'ends_at')
    if (endsAt <= startsAt) {
      throw new BusinessLogicException('Project sprint ends_at must be after starts_at')
    }
    if (dto.status !== undefined && dto.status !== 'draft' && dto.status !== 'active') {
      throw new BusinessLogicException('Project sprint status must be draft or active')
    }

    const now = DateTime.utc()
    const sprint = {
      id: randomUUID(),
      organization_id: access.project.organization_id,
      project_id: access.project.id,
      name,
      goal: this.normalizeGoal(dto.goal),
      status: dto.status ?? 'draft',
      starts_at: startsAt.toSQL(),
      ends_at: endsAt.toSQL(),
      created_by: access.actorId,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
      created_at: now.toSQL(),
      updated_at: now.toSQL(),
    }

    const [created] = (await db.table('project_sprints').insert(sprint).returning('*')) as ProjectSprintRecord[]
    if (!created) {
      throw new BusinessLogicException('Project sprint creation failed')
    }

    return created
  }

  private parseDateTime(value: string, field: string): DateTime {
    const parsed = DateTime.fromISO(value, { setZone: true }).toUTC()
    if (!parsed.isValid) {
      throw new BusinessLogicException(`Project sprint ${field} must be a valid ISO datetime`)
    }
    return parsed
  }

  private normalizeGoal(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null
    }

    const goal = value.trim()
    if (!goal) {
      return null
    }
    if (goal.length > 2000) {
      throw new BusinessLogicException('Project sprint goal must be 2000 characters or fewer')
    }

    return goal
  }
}
