import ValidationException from '#modules/errors/public_contracts/validation_exception'

function requiredId(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw ValidationException.field(field, `${field} is required`)
  return value.trim()
}

function sortOrder(value: unknown): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw ValidationException.field('sortOrder', 'sortOrder must be a non-negative integer')
  return parsed
}

function optionalStatus(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  return requiredId(value, 'taskStatusId')
}

export function buildUpdateTaskSortOrderRequest(params: unknown, body: unknown): {
  readonly taskId: string
  readonly newSortOrder: number
  readonly newTaskStatusId?: string
} {
  const route = params && typeof params === 'object' && !Array.isArray(params) ? (params as Record<string, unknown>) : {}
  const input = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
  const taskStatusId = optionalStatus(input['taskStatusId'] ?? input['task_status_id'])
  return {
    taskId: requiredId(route['taskId'], 'taskId'),
    newSortOrder: sortOrder(input['sortOrder'] ?? input['sort_order']),
    ...(taskStatusId === undefined ? {} : { newTaskStatusId: taskStatusId }),
  }
}

export function buildBatchUpdateTaskStatusRequest(body: unknown): {
  readonly taskIds: string[]
  readonly newTaskStatusId: string
} {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
  const rawIds = input['taskIds'] ?? input['task_ids']
  if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 1_000) {
    throw ValidationException.field('taskIds', 'taskIds must contain between 1 and 1000 ids')
  }
  const taskIds = rawIds.map((value) => requiredId(value, 'taskIds'))
  return { taskIds, newTaskStatusId: requiredId(input['taskStatusId'] ?? input['task_status_id'], 'taskStatusId') }
}
