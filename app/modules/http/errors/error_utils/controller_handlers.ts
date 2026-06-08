import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

import { getErrorCode, getErrorMessage, getErrorStatusCode } from './extractors.js'
import { logError } from './reporting.js'

import { ErrorMessages, createApiError, type ApiErrorResponse } from '#modules/errors/public_contracts/error_constants'
import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'
import { classifyHttpTransport } from '#modules/http/boundary/http_transport'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


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
