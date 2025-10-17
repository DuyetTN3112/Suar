import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

import { getErrorCode, getErrorMessage, getErrorStatusCode } from './extractors.js'
import { logError } from './reporting.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { ErrorMessages, createApiError, type ApiErrorResponse } from '#modules/errors/public_contracts/error_constants'
import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'
import { classifyHttpTransport } from '#modules/http/boundary/http_transport'

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

  const requestContext = ctx.requestContext as typeof ctx.requestContext | undefined
  const apiError = createApiError(code, message, undefined, omitUndefined({
    request_id: requestContext?.requestId,
    correlation_id: requestContext?.correlationId,
  }))
  emitApiError(ctx, {
    transport: classifyHttpTransport(ctx),
    status: statusCode,
    code,
    detail: message,
    includeLegacyMeta: true,
  })
  return apiError
}
