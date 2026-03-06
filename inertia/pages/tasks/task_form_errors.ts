export type TaskFormFieldErrors = Record<string, string>

export interface NormalizedTaskFormError {
  fieldErrors: TaskFormFieldErrors
  formError?: string
  message?: string
  status?: number
}

const DIRECT_FORM_FIELDS = new Set([
  'title',
  'description',
  'project_id',
  'task_status_id',
  'task_type',
  'verification_method',
  'priority',
  'label',
  'assigned_to',
  'due_date',
  'parent_task_id',
  'estimated_time',
  'required_skills',
  'acceptance_criteria',
  'context_background',
  'tech_stack',
  'learning_objectives',
  'domain_tags',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(getString).find((item): item is string => Boolean(item))
  }

  if (isRecord(value)) {
    return getString(value.message)
  }

  return undefined
}

function flattenErrors(
  source: unknown,
  prefix = '',
  output: TaskFormFieldErrors = {}
): TaskFormFieldErrors {
  if (!isRecord(source)) {
    return output
  }

  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key
    const message = getString(value)

    if (message) {
      output[path] = message
      continue
    }

    flattenErrors(value, path, output)
  }

  return output
}

function getNestedRecord(source: Record<string, unknown>, path: string[]): Record<string, unknown> | undefined {
  let current: unknown = source

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined
    }

    current = current[segment]
  }

  return isRecord(current) ? current : undefined
}

function getErrorPayload(error: unknown): {
  data?: Record<string, unknown>
  status?: number
  errors?: Record<string, unknown>
  message?: string
} {
  if (!isRecord(error)) {
    return {}
  }

  const response = isRecord(error.response) ? error.response : undefined
  const data = response && isRecord(response.data) ? response.data : undefined
  const inertiaErrors = isRecord(error) ? error : undefined
  const nestedError = data ? getNestedRecord(data, ['error']) : undefined

  return {
    data,
    status: typeof response?.status === 'number' ? response.status : undefined,
    errors:
      (data && isRecord(data.errors) ? data.errors : undefined) ??
      (nestedError && isRecord(nestedError.errors) ? nestedError.errors : undefined) ??
      inertiaErrors,
    message:
      getString(data?.message) ??
      getString(nestedError?.message) ??
      getString(error.message),
  }
}

function isDirectFormField(path: string): boolean {
  const [root] = path.split('.')
  return DIRECT_FORM_FIELDS.has(root)
}

export function normalizeTaskFormErrors(error: unknown): NormalizedTaskFormError {
  const payload = getErrorPayload(error)
  const allFieldErrors = flattenErrors(payload.errors)
  const fieldErrors: TaskFormFieldErrors = {}
  const formMessages: string[] = []

  for (const [path, message] of Object.entries(allFieldErrors)) {
    if (isDirectFormField(path)) {
      fieldErrors[path] = message
    } else {
      formMessages.push(`${path}: ${message}`)
    }
  }

  if (Object.keys(fieldErrors).length === 0 && payload.message) {
    formMessages.push(payload.message)
  }

  if (Object.keys(fieldErrors).length === 0 && formMessages.length === 0) {
    formMessages.push('Không thể xử lý yêu cầu. Vui lòng thử lại.')
  }

  return {
    fieldErrors,
    formError: formMessages.length > 0 ? formMessages.join('\n') : undefined,
    message: payload.message,
    status: payload.status,
  }
}
