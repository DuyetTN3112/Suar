import type { HttpContext } from '@adonisjs/core/http'

import {
  getErrorCodeFromStatus,
  getRequestMetadata,
  getSafeClientMessage,
  isHttpError,
  mapDomainException,
} from './http_exception_metadata.js'

import AppException from '#modules/errors/public_contracts/application_exception'
import {
  ErrorCode,
  HttpStatus,
} from '#modules/errors/public_contracts/error_constants'
import {
  sanitizeErrorDetails,
  sanitizeErrorStack,
  sanitizeErrorText,
} from '#modules/errors/public_contracts/error_sanitization'
import type { HttpErrorEventReporter } from '#modules/http/actions/ports/outbound/http_error_event_reporter'
import loggerService from '#modules/logger/public_contracts/application_logger'

export function shouldPersistErrorEvent(
  error: Error,
  status: number,
  errorCode: string
): boolean {
  // A PostgreSQL-backed telemetry table cannot safely report PostgreSQL failures.
  // Structured logs remain the authoritative signal for this failure family.
  if (errorCode.startsWith('E_DATABASE_')) {
    return false
  }

  if (error instanceof AppException) {
    return error.shouldReport
  }

  return status >= 500 || status === HttpStatus.RATE_LIMIT
}

export function persistErrorEvent(
  errorEvents: HttpErrorEventReporter,
  error: Error,
  ctx: HttpContext,
  statusCode: number,
  errorCode: string
): void {
  try {
    const metadata = getRequestMetadata(ctx)
    const safeMessage =
      error instanceof AppException
        ? error.safeMessage
        : getSafeClientMessage(error, statusCode)
    const details = sanitizeErrorDetails({
      errorName: error.name,
      stack: sanitizeErrorStack(error.stack),
      retryable: error instanceof AppException ? error.retryable : false,
      context: error instanceof AppException ? (error.details ?? null) : null,
    })

    errorEvents.enqueue({
      code: errorCode,
      status: statusCode,
      severity: statusCode >= 500 ? 'error' : 'warning',
      message: sanitizeErrorText(error.message),
      safe_message: sanitizeErrorText(safeMessage, 1_024),
      details,
      request_id: metadata.requestId,
      correlation_id: metadata.correlationId,
      actor_user_id: metadata.actorUserId,
      actor_org_id: metadata.actorOrgId,
      method: metadata.method,
      url: metadata.url,
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent === null ? null : sanitizeErrorText(metadata.userAgent, 512),
    })
  } catch (enqueueError) {
    loggerService.warn('[HttpException] Failed to enqueue error event', {
      originalCode: errorCode,
      originalStatus: statusCode,
      enqueueError: sanitizeErrorText(
        enqueueError instanceof Error ? enqueueError.message : 'Unknown enqueue error'
      ),
    })
  }
}

export function reportHttpException(
  errorEvents: HttpErrorEventReporter,
  error: unknown,
  ctx: HttpContext
): void {
  const mappedError = mapDomainException(error)
  const reportableError =
    mappedError instanceof Error ? mappedError : new Error('A non-Error value was thrown')
  const statusCode = isHttpError(reportableError)
    ? reportableError.status
    : HttpStatus.INTERNAL_SERVER_ERROR
  const errorCode = isHttpError(reportableError)
    ? (reportableError.code ?? getErrorCodeFromStatus(statusCode))
    : ErrorCode.INTERNAL
  const shouldReport =
    reportableError instanceof AppException
      ? reportableError.shouldReport
      : statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
  const metadata = getRequestMetadata(ctx)
  const logPayload = {
    code: errorCode,
    status: statusCode,
    requestId: metadata.requestId,
    correlationId: metadata.correlationId,
    url: metadata.url,
    method: metadata.method,
    userId: metadata.actorUserId ?? 'anonymous',
    stack: sanitizeErrorStack(reportableError.stack),
  }
  const logMessage = `[HttpException] ${sanitizeErrorText(reportableError.message)}`

  if (!shouldReport) {
    return
  }

  loggerService.error(logMessage, logPayload)

  if (shouldPersistErrorEvent(reportableError, statusCode, errorCode)) {
    persistErrorEvent(errorEvents, reportableError, ctx, statusCode, errorCode)
  }
}
