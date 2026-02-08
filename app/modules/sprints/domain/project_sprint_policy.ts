import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  canTransitionProjectSprint,
  type ProjectSprintCoreStatus,
} from '#modules/sprints/domain/sprint_core_rules'

const MAX_SPRINT_GOAL_LENGTH = 2000
const PROJECT_SPRINT_STATUSES = new Set<ProjectSprintCoreStatus>([
  'draft',
  'active',
  'review_open',
  'review_closed',
  'archived',
])

interface ProjectSprintUpdateInput {
  name?: string
  goal?: string | null
  starts_at?: string
  ends_at?: string
  status?: ProjectSprintCoreStatus
}

interface CurrentProjectSprintState {
  starts_at: unknown
  ends_at: unknown
  status: ProjectSprintCoreStatus
}

export type ProjectSprintUpdateAttributes = {
  name?: string
  goal?: string | null
  starts_at?: string
  ends_at?: string
  status?: ProjectSprintCoreStatus
}

export function normalizeProjectSprintName(value: string): string {
  const name = value.trim()
  if (!name) {
    throw ValidationException.field('name', 'Project sprint name is required')
  }
  return name
}

export function normalizeProjectSprintGoal(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null

  const goal = value.trim()
  if (!goal) return null
  if (goal.length > MAX_SPRINT_GOAL_LENGTH) {
    throw ValidationException.field('goal', 'Project sprint goal must be 2000 characters or fewer')
  }
  return goal
}

export function parseProjectSprintDateTime(value: string, field: string): Date {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw ValidationException.field(field, `Project sprint ${field} must be a valid ISO datetime`)
  }
  return parsed
}

export function parseProjectSprintSchedule(
  startsAtValue: string,
  endsAtValue: string
): { startsAt: Date; endsAt: Date } {
  const startsAt = parseProjectSprintDateTime(startsAtValue, 'starts_at')
  const endsAt = parseProjectSprintDateTime(endsAtValue, 'ends_at')
  assertProjectSprintSchedule(startsAt, endsAt)
  return { startsAt, endsAt }
}

export function assertCreateProjectSprintStatus(
  status?: ProjectSprintCoreStatus
): asserts status is 'draft' | 'active' | undefined {
  if (status !== undefined && status !== 'draft' && status !== 'active') {
    throw ValidationException.field('status', 'Project sprint status must be draft or active')
  }
}

export function buildProjectSprintUpdateAttributes(
  input: ProjectSprintUpdateInput,
  current: CurrentProjectSprintState
): ProjectSprintUpdateAttributes {
  const updates: ProjectSprintUpdateAttributes = {}

  if (input.name !== undefined) updates.name = normalizeProjectSprintName(input.name)
  if (input.goal !== undefined) updates.goal = normalizeProjectSprintGoal(input.goal)

  applyScheduleUpdates(input, current, updates)
  applyStatusUpdate(input.status, current.status, updates)

  return updates
}

function applyScheduleUpdates(
  input: ProjectSprintUpdateInput,
  current: CurrentProjectSprintState,
  updates: ProjectSprintUpdateAttributes
): void {
  const startsAt =
    input.starts_at === undefined
      ? parsePersistedDateTime(current.starts_at, 'starts_at')
      : parseProjectSprintDateTime(input.starts_at, 'starts_at')
  const endsAt =
    input.ends_at === undefined
      ? parsePersistedDateTime(current.ends_at, 'ends_at')
      : parseProjectSprintDateTime(input.ends_at, 'ends_at')

  assertProjectSprintSchedule(startsAt, endsAt)
  if (input.starts_at !== undefined) updates.starts_at = startsAt.toISOString()
  if (input.ends_at !== undefined) updates.ends_at = endsAt.toISOString()
}

function applyStatusUpdate(
  requestedStatus: ProjectSprintCoreStatus | undefined,
  currentStatus: ProjectSprintCoreStatus,
  updates: ProjectSprintUpdateAttributes
): void {
  if (!PROJECT_SPRINT_STATUSES.has(currentStatus)) {
    throw new PersistedDataIntegrityException(
      'Persisted project sprint status is outside the lifecycle contract',
      {
        field: 'status',
        status: currentStatus,
      }
    )
  }
  if (requestedStatus === undefined || requestedStatus === currentStatus) return
  if (!PROJECT_SPRINT_STATUSES.has(requestedStatus)) {
    throw ValidationException.field('status', `Unknown project sprint status: ${requestedStatus}`)
  }

  const transition = canTransitionProjectSprint({
    from: currentStatus,
    to: requestedStatus,
    actorCanManageSprint: true,
  })
  if (!transition.allowed) {
    throw new ConflictException(transition.reason ?? 'Invalid project sprint transition', {
      from: currentStatus,
      to: requestedStatus,
    })
  }
  updates.status = requestedStatus
}

function parsePersistedDateTime(value: unknown, field: 'starts_at' | 'ends_at'): Date {
  const parsed =
    value instanceof Date
      ? new Date(value)
      : typeof value === 'string'
        ? new Date(value)
        : null

  if (parsed === null || Number.isNaN(parsed.getTime())) {
    throw new PersistedDataIntegrityException(
      'Persisted project sprint datetime violates the storage contract',
      {
        field,
        valueType: value === null ? 'null' : typeof value,
      }
    )
  }
  return parsed
}

function assertProjectSprintSchedule(startsAt: Date, endsAt: Date): void {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw ValidationException.field('ends_at', 'Project sprint ends_at must be after starts_at')
  }
}
