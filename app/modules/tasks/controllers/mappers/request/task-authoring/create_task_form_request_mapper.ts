import ValidationException from '#modules/errors/public_contracts/validation_exception'

interface RequestLike {
  input(key: string, defaultValue?: unknown): unknown
}

interface SessionLike {
  get(key: string): unknown
}

export interface CreateTaskFormRequest {
  readonly projectId?: string
  readonly roleId?: string
  readonly taskType?: string
  readonly workArea?: string
  readonly status?: string
}

function optionalQueryString(
  value: unknown,
  path: string,
  maxLength = 200
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field(path, `${path} must be a non-empty string`)
  }
  const normalized = value.trim()
  if (normalized.length > maxLength) {
    throw ValidationException.field(path, `${path} must be no longer than ${maxLength} characters`)
  }
  return normalized
}

export function buildCreateTaskFormRequest(
  request: RequestLike,
  session: SessionLike
): CreateTaskFormRequest {
  const projectId =
    optionalQueryString(request.input('projectId'), 'projectId') ??
    optionalQueryString(request.input('project_id'), 'project_id') ??
    optionalQueryString(session.get('current_project_id'), 'current_project_id')
  const roleId =
    optionalQueryString(request.input('roleId'), 'roleId') ??
    optionalQueryString(request.input('role_id'), 'role_id')
  const taskType =
    optionalQueryString(request.input('taskType'), 'taskType') ??
    optionalQueryString(request.input('task_type'), 'task_type')
  const workArea =
    optionalQueryString(request.input('workArea'), 'workArea') ??
    optionalQueryString(request.input('work_area'), 'work_area')
  const status = optionalQueryString(request.input('status'), 'status')

  return {
    ...(projectId === undefined ? {} : { projectId }),
    ...(roleId === undefined ? {} : { roleId }),
    ...(taskType === undefined ? {} : { taskType }),
    ...(workArea === undefined ? {} : { workArea }),
    ...(status === undefined ? {} : { status }),
  }
}
