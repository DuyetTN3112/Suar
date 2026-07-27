import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'
import type { MoveTaskToSprintDTO } from '#modules/sprints/public_contracts/task-sprint-assignment/sprint_task_assignment'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MOVE_REASONS = new Set(['planned', 'scope_change', 'carry_over', 'restored'])

export function buildMoveTaskToSprintInput(
  projectId: unknown,
  taskId: unknown,
  payload: unknown
): MoveTaskToSprintDTO {
  const issues: ValidationIssue[] = []
  const body = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : (issues.push(validationIssue('body', 'Value must be an object', 'REQUEST_OBJECT_REQUIRED')), {})
  const project = requiredUuid(projectId, 'projectId', 'Project ID', issues)
  const task = requiredUuid(taskId, 'taskId', 'Task ID', issues)
  const hasCamel = Object.prototype.hasOwnProperty.call(body, 'projectSprintId')
  const hasSnake = Object.prototype.hasOwnProperty.call(body, 'project_sprint_id')
  if (hasCamel && hasSnake) {
    issues.push(validationIssue('projectSprintId', 'Use either projectSprintId or project_sprint_id, not both', 'REQUEST_ALIAS_CONFLICT'))
  }
  const sprint = hasCamel ? body['projectSprintId'] : body['project_sprint_id']
  const projectSprintId = optionalUuid(sprint, 'projectSprintId', 'Project Sprint ID', issues)
  const reason = body['reason']
  if (reason !== undefined && (typeof reason !== 'string' || !MOVE_REASONS.has(reason))) {
    issues.push(validationIssue('reason', 'Sprint move reason is invalid', 'SPRINT_REASON_INVALID'))
  }
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return {
    project_id: project as string,
    task_id: task as string,
    project_sprint_id: projectSprintId === undefined ? null : projectSprintId,
    ...(typeof reason === 'string' ? { reason: reason as Exclude<MoveTaskToSprintDTO['reason'], undefined> } : {}),
  }
}

function requiredUuid(value: unknown, path: string, label: string, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    issues.push(validationIssue(path, `${label} must be a valid UUID`, 'UUID_INVALID'))
    return undefined
  }
  return value
}

function optionalUuid(value: unknown, path: string, label: string, issues: ValidationIssue[]): string | null | undefined {
  if (value === undefined || value === null) return value
  return requiredUuid(value, path, label, issues)
}
