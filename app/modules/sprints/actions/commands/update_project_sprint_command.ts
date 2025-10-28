import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/sprint_external_dependencies'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanManageProjectSprints } from '#modules/sprints/actions/support/project_sprint_access'
import { sprintExternalDeps } from '#modules/sprints/bootstrap/sprint_composition_root'
import {
  canTransitionProjectSprint,
  type ProjectSprintCoreStatus,
} from '#modules/sprints/domain/sprint_core_rules'
import type { ProjectSprintRecord } from '#modules/sprints/types/project_sprint_records'

export interface UpdateProjectSprintDTO {
  project_id: string
  sprint_id: string
  name?: string
  goal?: string | null
  starts_at?: string
  ends_at?: string
  status?: ProjectSprintCoreStatus
}

const PROJECT_SPRINT_STATUSES = new Set<ProjectSprintCoreStatus>([
  'draft',
  'active',
  'review_open',
  'review_closed',
  'archived',
])

export default class UpdateProjectSprintCommand {
  constructor(
    private readonly execCtx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies = sprintExternalDeps
  ) {}

  async execute(dto: UpdateProjectSprintDTO): Promise<ProjectSprintRecord> {
    const trx = await db.transaction()

    try {
      const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
        this.execCtx,
        dto.project_id,
        trx
      )
      assertCanManageProjectSprints(access)

      const sprint = (await trx
        .from('project_sprints')
        .where('id', dto.sprint_id)
        .where('project_id', dto.project_id)
        .forUpdate()
        .first()) as ProjectSprintRecord | undefined

      if (!sprint) {
        throw new NotFoundException('Project sprint not found')
      }

      const updates: Record<string, unknown> = {}
      if (dto.name !== undefined) {
        const name = dto.name.trim()
        if (!name) {
          throw new BusinessLogicException('Project sprint name is required')
        }
        updates['name'] = name
      }
      if (dto.goal !== undefined) {
        updates['goal'] = this.normalizeGoal(dto.goal)
      }
      if (dto.starts_at !== undefined) {
        updates['starts_at'] = this.parseDateTime(dto.starts_at, 'starts_at').toSQL()
      }
      if (dto.ends_at !== undefined) {
        updates['ends_at'] = this.parseDateTime(dto.ends_at, 'ends_at').toSQL()
      }
      if (dto.status !== undefined && dto.status !== sprint.status) {
        if (!PROJECT_SPRINT_STATUSES.has(dto.status)) {
          throw new BusinessLogicException(`Unknown project sprint status: ${dto.status}`)
        }
        const transition = canTransitionProjectSprint({
          from: sprint.status,
          to: dto.status,
          actorCanManageSprint: true,
        })
        if (!transition.allowed) {
          throw new BusinessLogicException(transition.reason ?? 'Invalid project sprint transition')
        }
        updates['status'] = dto.status
      }

      const startsAt = this.parsePersistedDateTime(updates['starts_at'] ?? sprint.starts_at)
      const endsAt = this.parsePersistedDateTime(updates['ends_at'] ?? sprint.ends_at)
      if (!startsAt.isValid || !endsAt.isValid || endsAt <= startsAt) {
        throw new BusinessLogicException('Project sprint ends_at must be after starts_at')
      }

      updates['updated_at'] = DateTime.utc().toSQL()
      const [updated] = (await trx
        .from('project_sprints')
        .where('id', sprint.id)
        .update(updates)
        .returning('*')) as ProjectSprintRecord[]

      await trx.commit()
      if (!updated) {
        throw new BusinessLogicException('Project sprint update failed')
      }
      return updated
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private parseDateTime(value: string, field: string): DateTime {
    const parsed = DateTime.fromISO(value, { setZone: true }).toUTC()
    if (!parsed.isValid) {
      throw new BusinessLogicException(`Project sprint ${field} must be a valid ISO datetime`)
    }
    return parsed
  }

  private parsePersistedDateTime(value: unknown): DateTime {
    if (value instanceof Date) return DateTime.fromJSDate(value).toUTC()
    if (typeof value === 'string') return DateTime.fromISO(value, { setZone: true }).toUTC()
    return DateTime.invalid('Invalid persisted project sprint datetime')
  }

  private normalizeGoal(value: string | null): string | null {
    if (value === null) {
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
