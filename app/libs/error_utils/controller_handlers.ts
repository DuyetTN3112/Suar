import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import { ErrorMessages, createApiError, type ApiErrorResponse } from '#constants/error_constants'
import { getErrorCode, getErrorMessage, getErrorStatusCode } from './extractors.js'
import { logError } from './reporting.js'

export function handleControllerError(
  error: unknown,
  ctx: HttpContext,
  context: string,
  fallbackMessage: string = ErrorMessages.GENERIC_ERROR
): void {
  if (error instanceof Exception) {
    throw error
  }

  logError(context, error)

  const message = getErrorMessage(error, fallbackMessage)
  ctx.session.flash('error', message)
  ctx.response.redirect().back()
}

export function handleApiControllerError(
  error: unknown,
  ctx: HttpContext,
  context: string,
  fallbackMessage: string = ErrorMessages.GENERIC_ERROR
): ApiErrorResponse {
  if (error instanceof Exception) {
    throw error
  }

  logError(context, error)

  const message = getErrorMessage(error, fallbackMessage)
  const statusCode = getErrorStatusCode(error)
  const code = getErrorCode(error) ?? 'UNKNOWN_ERROR'

  const apiError = createApiError(code, message)
  ctx.response.status(statusCode).json(apiError)
  return apiError
}
