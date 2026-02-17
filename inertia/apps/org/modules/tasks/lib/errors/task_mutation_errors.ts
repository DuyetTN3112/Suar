import { normalizeApiProblem } from '@/apps/shared/http/api_problem'

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

const FALLBACK_MESSAGE = 'Unable to process the request. Please try again.'
const NETWORK_MESSAGE = 'Unable to reach the server. Check your network and try again.'

function isConflictCode(code: string): boolean {
  return (
    code === 'E_CONFLICT' ||
    code === 'CONFLICT' ||
    code === 'INVALID_STATE' ||
    code.endsWith('.CONFLICT') ||
    code.endsWith('.INVALID_STATE') ||
    code.endsWith('.INVALID_TRANSITION')
  )
}

export function normalizeTaskMutationError(
  error: unknown,
  fallback = FALLBACK_MESSAGE,
  networkFallback = NETWORK_MESSAGE
): NormalizedTaskMutationError {
  const problem = normalizeApiProblem(error)
  const status = problem.status ?? undefined
  const code = problem.code === 'E_UNKNOWN' ? undefined : problem.code
  const message = problem.networkError
    ? networkFallback
    : problem.code === 'E_UNKNOWN'
      ? fallback
      : problem.detail

  return {
    message,
    fieldErrors: problem.fieldErrors,
    status,
    code,
    isConflict: status === 409 || (code !== undefined && isConflictCode(code)),
    isPermission: status === 401 || status === 403,
    isValidation: status === 422 || Object.keys(problem.fieldErrors).length > 0,
  }
}
