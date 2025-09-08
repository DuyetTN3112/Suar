export type TaskMutationFieldErrors = Record<string, string>

export interface NormalizedTaskMutationError {
  message: string
  fieldErrors: TaskMutationFieldErrors
  status?: number
  code?: string
  isConflict: boolean
  isPermission: boolean
  isValidation: boolean
}

const FALLBACK_MESSAGE = 'Không thể xử lý yêu cầu. Vui lòng thử lại.'
const NETWORK_MESSAGE = 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isHtml(value: string): boolean {
  return /^\s*</.test(value)
}

function getString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return isHtml(value) ? undefined : value
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
  output: TaskMutationFieldErrors = {}
): TaskMutationFieldErrors {
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

export function normalizeTaskMutationError(
  error: unknown,
  fallback = FALLBACK_MESSAGE
): NormalizedTaskMutationError {
  const response = isRecord(error) && isRecord(error.response) ? error.response : undefined
  const status = typeof response?.status === 'number' ? response.status : undefined
  const data = response && isRecord(response.data) ? response.data : undefined
  const nestedError = data && isRecord(data.error) ? data.error : undefined
  const fieldErrors = flattenErrors(data?.errors ?? nestedError?.errors)
  const code = getString(nestedError?.code) ?? getString(data?.code)
  const message =
    getString(nestedError?.message) ??
    getString(data?.error) ??
    getString(data?.message) ??
    (response ? undefined : getString(isRecord(error) ? error.message : undefined)) ??
    (response ? fallback : NETWORK_MESSAGE)

  return {
    message,
    fieldErrors,
    status,
    code,
    isConflict: status === 409 || code === 'INVALID_STATE' || code === 'CONFLICT',
    isPermission: status === 401 || status === 403,
    isValidation: status === 422 || Object.keys(fieldErrors).length > 0,
  }
}
