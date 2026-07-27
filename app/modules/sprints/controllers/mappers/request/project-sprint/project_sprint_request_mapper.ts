import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'
import type {
  CreateProjectSprintDTO,
  EndProjectSprintDeliveryDTO,
  ProjectSprintCoreStatus,
  ReorderProjectBacklogDTO,
  UpdateProjectSprintDTO,
} from '#modules/sprints/public_contracts/sprint_public_api'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SPRINT_STATUSES = new Set(['draft', 'active', 'review_open', 'review_closed', 'archived'])

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.fromIssues([
      validationIssue(path, 'Value must be an object', 'REQUEST_OBJECT_REQUIRED'),
    ])
  }
  return value as UnknownRecord
}

function has(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function readAlias(
  record: UnknownRecord,
  camelKey: string,
  snakeKey: string,
  path: string,
  issues: ValidationIssue[]
): unknown {
  if (has(record, camelKey) && has(record, snakeKey)) {
    issues.push(
      validationIssue(
        path,
        `Use either ${camelKey} or ${snakeKey}, not both`,
        'REQUEST_ALIAS_CONFLICT'
      )
    )
  }
  return has(record, camelKey) ? record[camelKey] : record[snakeKey]
}

function requiredUuid(value: unknown, path: string, label: string, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    issues.push(validationIssue(path, `${label} must be a valid UUID`, 'UUID_INVALID'))
    return undefined
  }
  return value
}

function requiredString(value: unknown, path: string, message: string, code: string, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(path, message, code))
    return undefined
  }
  return value
}

function optionalString(value: unknown, path: string, message: string, code: string, issues: ValidationIssue[]): string | null | undefined {
  if (value === undefined || value === null) return value
  if (typeof value !== 'string') {
    issues.push(validationIssue(path, message, code))
    return undefined
  }
  return value
}

function optionalUuid(value: unknown, path: string, label: string, issues: ValidationIssue[]): string | null | undefined {
  if (value === undefined || value === null) return value
  return requiredUuid(value, path, label, issues)
}

function throwIfInvalid(issues: readonly ValidationIssue[]): void {
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
}

function routeIds(
  projectId: unknown,
  sprintId: unknown,
  issues: ValidationIssue[]
): { projectId?: string; sprintId?: string } {
  const normalizedProjectId = requiredUuid(projectId, 'projectId', 'Project ID', issues)
  const normalizedSprintId =
    sprintId === undefined ? undefined : requiredUuid(sprintId, 'sprintId', 'Sprint ID', issues)
  const result: { projectId?: string; sprintId?: string } = {}
  if (normalizedProjectId !== undefined) result.projectId = normalizedProjectId
  if (normalizedSprintId !== undefined) result.sprintId = normalizedSprintId
  return result
}

export function buildProjectSprintRouteInput(
  projectId: unknown,
  sprintId: unknown
): { project_id: string; sprint_id: string } {
  const issues: ValidationIssue[] = []
  const ids = routeIds(projectId, sprintId, issues)
  throwIfInvalid(issues)

  return {
    project_id: ids.projectId as string,
    sprint_id: ids.sprintId as string,
  }
}

export function buildStartProjectSprintInput(
  projectId: unknown,
  sprintId: unknown
): { project_id: string; sprint_id: string } {
  return buildProjectSprintRouteInput(projectId, sprintId)
}

export function buildCreateProjectSprintInput(
  projectId: unknown,
  payload: unknown
): CreateProjectSprintDTO {
  const body = asRecord(payload, 'body')
  const issues: ValidationIssue[] = []
  const ids = routeIds(projectId, undefined, issues)
  const name = requiredString(
    body['name'],
    'name',
    'Sprint name must be a non-empty string',
    'SPRINT_NAME_INVALID',
    issues
  )
  const startsAt = requiredString(
    body['startsAt'] ?? body['starts_at'],
    'startsAt',
    'Sprint start must be a non-empty string',
    'SPRINT_START_INVALID',
    issues
  )
  const endsAt = requiredString(
    body['endsAt'] ?? body['ends_at'],
    'endsAt',
    'Sprint end must be a non-empty string',
    'SPRINT_END_INVALID',
    issues
  )
  const goal = optionalString(
    body['goal'],
    'goal',
    'Sprint goal must be a string or null',
    'SPRINT_GOAL_INVALID',
    issues
  )
  const status = body['status']
  if (status !== undefined && status !== 'draft') {
    issues.push(validationIssue('status', 'New Sprint status must be draft', 'SPRINT_STATUS_INVALID'))
  }

  throwIfInvalid(issues)
  return {
    project_id: ids.projectId as string,
    name: name as string,
    starts_at: startsAt as string,
    ends_at: endsAt as string,
    ...(goal !== undefined ? { goal } : {}),
    ...(status !== undefined ? { status: 'draft' } : {}),
  }
}

export function buildUpdateProjectSprintInput(
  projectId: unknown,
  sprintId: unknown,
  payload: unknown
): UpdateProjectSprintDTO {
  const body = asRecord(payload, 'body')
  const issues: ValidationIssue[] = []
  const ids = routeIds(projectId, sprintId, issues)
  const name = optionalString(
    body['name'],
    'name',
    'Sprint name must be a string',
    'SPRINT_NAME_INVALID',
    issues
  )
  const goal = optionalString(
    body['goal'],
    'goal',
    'Sprint goal must be a string or null',
    'SPRINT_GOAL_INVALID',
    issues
  )
  const startsAt = readAlias(body, 'startsAt', 'starts_at', 'startsAt', issues)
  const endsAt = readAlias(body, 'endsAt', 'ends_at', 'endsAt', issues)
  const normalizedStartsAt = optionalString(
    startsAt,
    'startsAt',
    'Sprint start must be a string',
    'SPRINT_START_INVALID',
    issues
  )
  const normalizedEndsAt = optionalString(
    endsAt,
    'endsAt',
    'Sprint end must be a string',
    'SPRINT_END_INVALID',
    issues
  )
  const status = body['status']
  if (status !== undefined && (typeof status !== 'string' || !SPRINT_STATUSES.has(status))) {
    issues.push(validationIssue('status', 'Sprint status is invalid', 'SPRINT_STATUS_INVALID'))
  }
  const normalizedStatus =
    typeof status === 'string' && SPRINT_STATUSES.has(status)
      ? (status as ProjectSprintCoreStatus)
      : undefined

  throwIfInvalid(issues)
  return {
    project_id: ids.projectId as string,
    sprint_id: ids.sprintId as string,
    ...(name !== undefined ? { name: name as string } : {}),
    ...(goal !== undefined ? { goal } : {}),
    ...(normalizedStartsAt !== undefined ? { starts_at: normalizedStartsAt as string } : {}),
    ...(normalizedEndsAt !== undefined ? { ends_at: normalizedEndsAt as string } : {}),
    ...(normalizedStatus !== undefined ? { status: normalizedStatus } : {}),
  }
}

export function buildReorderProjectBacklogInput(
  projectId: unknown,
  taskId: unknown,
  payload: unknown
): ReorderProjectBacklogDTO {
  const body = asRecord(payload, 'body')
  const issues: ValidationIssue[] = []
  const project = requiredUuid(projectId, 'projectId', 'Project ID', issues)
  const task = requiredUuid(taskId, 'taskId', 'Task ID', issues)
  const before = readAlias(body, 'beforeTaskId', 'before_task_id', 'beforeTaskId', issues)
  const after = readAlias(body, 'afterTaskId', 'after_task_id', 'afterTaskId', issues)
  const beforeTaskId = optionalUuid(before, 'beforeTaskId', 'Before task ID', issues)
  const afterTaskId = optionalUuid(after, 'afterTaskId', 'After task ID', issues)
  if (beforeTaskId && afterTaskId) {
    issues.push(validationIssue('placement', 'Choose beforeTaskId or afterTaskId, not both', 'BACKLOG_PLACEMENT_CONFLICT'))
  }

  throwIfInvalid(issues)
  return {
    project_id: project as string,
    task_id: task as string,
    ...(beforeTaskId !== undefined ? { before_task_id: beforeTaskId } : {}),
    ...(afterTaskId !== undefined ? { after_task_id: afterTaskId } : {}),
  }
}

export function buildEndProjectSprintDeliveryInput(
  projectId: unknown,
  sprintId: unknown,
  payload: unknown
): EndProjectSprintDeliveryDTO {
  const body = asRecord(payload, 'body')
  const issues: ValidationIssue[] = []
  const ids = routeIds(projectId, sprintId, issues)
  const rawTasks = body['incompleteTasks'] ?? body['incomplete_tasks'] ?? []
  if (!Array.isArray(rawTasks)) {
    issues.push(validationIssue('incompleteTasks', 'Incomplete tasks must be an array', 'SPRINT_TASKS_INVALID'))
  }

  const incompleteTasks: EndProjectSprintDeliveryDTO['incomplete_tasks'] = []
  if (Array.isArray(rawTasks)) {
    for (const [index, rawTask] of rawTasks.entries()) {
      if (!rawTask || typeof rawTask !== 'object' || Array.isArray(rawTask)) {
        issues.push(validationIssue(`incompleteTasks.${index}`, 'Task entry must be an object', 'SPRINT_TASK_ENTRY_INVALID'))
        continue
      }
      const task = rawTask as UnknownRecord
      const taskId = requiredUuid(task['taskId'] ?? task['task_id'], `incompleteTasks.${index}.taskId`, 'Task ID', issues)
      const destinationValue = task['destination']
      if (!destinationValue || typeof destinationValue !== 'object' || Array.isArray(destinationValue)) {
        issues.push(validationIssue(`incompleteTasks.${index}.destination`, 'Destination must be an object', 'SPRINT_DESTINATION_INVALID'))
        continue
      }
      const destination = destinationValue as UnknownRecord
      const kind = destination['kind']
      if (kind === 'backlog') {
        if (taskId) incompleteTasks.push({ task_id: taskId, destination: { kind: 'backlog' } })
        continue
      }
      if (kind !== 'sprint') {
        issues.push(validationIssue(`incompleteTasks.${index}.destination.kind`, 'Destination kind is invalid', 'SPRINT_DESTINATION_KIND_INVALID'))
        continue
      }
      const nextSprintId = requiredUuid(
        destination['sprintId'] ?? destination['sprint_id'],
        `incompleteTasks.${index}.destination.sprintId`,
        'Destination Sprint ID',
        issues
      )
      if (taskId && nextSprintId) {
        incompleteTasks.push({ task_id: taskId, destination: { kind: 'sprint', sprint_id: nextSprintId } })
      }
    }
  }

  throwIfInvalid(issues)
  return {
    project_id: ids.projectId as string,
    sprint_id: ids.sprintId as string,
    incomplete_tasks: incompleteTasks,
  }
}
