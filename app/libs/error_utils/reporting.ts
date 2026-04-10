import loggerService from '#infra/logger/logger_service'
import { getErrorCode, getErrorMessage, isError } from './extractors.js'

export function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError: (error: unknown, message: string) => T
): Promise<T> {
  return fn().catch((error: unknown) => {
    const message = getErrorMessage(error)
    return onError(error, message)
  })
}

export function serializeError(
  error: unknown,
  includeDetails = false
): { error: string; code?: string; details?: string } {
  const message = getErrorMessage(error)
  const code = getErrorCode(error)

  const result: { error: string; code?: string; details?: string } = {
    error: message,
  }

  if (code) {
    result.code = code
  }

  if (includeDetails && isError(error)) {
    result.details = error.stack
  }

  return result
}

export function logError(
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void {
  const message = getErrorMessage(error)
  const code = getErrorCode(error)
  const stack = isError(error) ? error.stack : undefined

  loggerService.error(`[${context}] Error:`, {
    message,
    code,
    stack,
    ...additionalData,
  })
}
