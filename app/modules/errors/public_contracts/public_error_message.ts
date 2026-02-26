import AppException from './application_exception.js'
import { ErrorMessages } from './error_constants.js'

/**
 * Converts an application failure into text that is safe to expose in a
 * per-item result. Generic error messages remain server-side diagnostics.
 */
export function publicErrorMessage(error: unknown): string {
  return error instanceof AppException ? error.safeMessage : ErrorMessages.GENERIC_ERROR
}
