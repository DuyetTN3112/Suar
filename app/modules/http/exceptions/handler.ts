import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import { ExceptionHandler } from '@adonisjs/core/http'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import { ValidationError as VineValidationError } from '@vinejs/vine'
import { Youch } from 'youch'

import { isPolicyViolationException } from '#modules/authorization/public_contracts/policy_violation'
import AppException from '#modules/errors/public_contracts/application_exception'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import {
  HttpStatus,
  ErrorCode,
  ErrorMessages,
} from '#modules/errors/public_contracts/error_constants'
import {
  sanitizeErrorDetails,
  sanitizeErrorStack,
  sanitizeErrorText,
  sanitizeRequestUrl,
} from '#modules/errors/public_contracts/error_sanitization'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import PostgresException from '#modules/errors/public_contracts/postgres_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { HttpErrorEventReporter } from '#modules/http/actions/ports/outbound/http_error_event_reporter'
import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'
import { classifyHttpTransport, isApiTransport } from '#modules/http/boundary/http_transport'
import RateLimitException from '#modules/http/exceptions/rate_limit_exception'
import { AuthRoutes, InertiaPages } from '#modules/http/public_contracts/route_constants'
import loggerService from '#modules/logger/public_contracts/application_logger'

interface HttpError {
  status: number
  code?: string
  message?: string
  messages?: unknown
}

interface ErrorWithDefaultHeaders {
  getDefaultHeaders(): Record<string, unknown>
}

interface RuntimeHttpContext {
  request?: {
    url?: () => unknown
    method?: () => unknown
    ip?: () => unknown
    header?: (name: string) => unknown
  }
  requestContext?: {
    requestId?: unknown
    correlationId?: unknown
  }
  auth?: {
    user?: {
      id?: unknown
    }
  }
  session?: {
    get?: (key: string) => unknown
  }
}

interface RequestMetadata {
  requestId: string | null
  correlationId: string | null
  actorUserId: string | null
  actorOrgId: string | null
  method: string | null
  url: string | null
  ipAddress: string | null
  userAgent: string | null
}

function readString(readValue: () => unknown): string | null {
  try {
    const value = readValue()
    return typeof value === 'string' && value.length > 0 ? value : null
  } catch {
    return null
  }
}

function getRequestMetadata(ctx: HttpContext): RequestMetadata {
  const runtimeCtx = ctx as unknown as RuntimeHttpContext

  return {
    requestId: readString(() => runtimeCtx.requestContext?.requestId),
    correlationId: readString(() => runtimeCtx.requestContext?.correlationId),
    actorUserId: readString(() => runtimeCtx.auth?.user?.id),
    actorOrgId: readString(() => runtimeCtx.session?.get?.('current_organization_id')),
    method: readString(() => runtimeCtx.request?.method?.()),
    url: sanitizeRequestUrl(readString(() => runtimeCtx.request?.url?.())),
    ipAddress: readString(() => runtimeCtx.request?.ip?.()),
    userAgent: readString(() => runtimeCtx.request?.header?.('user-agent')),
  }
}

/**
 * Only application and framework exceptions may control the HTTP response status.
 * A plain object with a `status` property is untrusted and must remain a safe 500.
 */
const isHttpError = (err: unknown): err is HttpError => {
  return (
    (err instanceof AppException ||
      err instanceof Exception ||
      err instanceof VineValidationError) &&
    Number.isInteger((err as HttpError).status) &&
    (err as HttpError).status >= 400 &&
    (err as HttpError).status <= 599
  )
}

const hasDefaultHeaders = (error: unknown): error is ErrorWithDefaultHeaders => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'getDefaultHeaders' in error &&
    typeof error.getDefaultHeaders === 'function'
  )
}

const applyDefaultHeaders = (
  response: HttpContext['response'],
  error: ErrorWithDefaultHeaders
): void => {
  const headers = error.getDefaultHeaders()
  for (const [key, value] of Object.entries(headers)) {
    response.header(key, String(value))
  }
}

/**
 * Kiểm tra xem request có phải là Inertia request không
 */
const isInertiaRequest = (request: HttpContext['request']): boolean => {
  return !!request.header('X-Inertia')
}

const requestAllowsAutomaticRetry = (request: HttpContext['request']): boolean => {
  try {
    const method = request.method().toUpperCase()
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true
    }
    return Boolean(request.header('Idempotency-Key')?.trim())
  } catch {
    return false
  }
}

@inject()
export default class HttpExceptionHandler extends ExceptionHandler {
  constructor(private readonly errorEvents: HttpErrorEventReporter) {
    super()
  }

  protected override debug = !app.inProduction
  protected override renderStatusPages = true

  protected override statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (error, { inertia, response }) => {
      const message = isHttpError(error) && error.message ? error.message : ErrorMessages.NOT_FOUND
      response.status(HttpStatus.NOT_FOUND)
      return inertia.render(InertiaPages.ERROR_NOT_FOUND, { message })
    },
    '403': (_error, { inertia }) => inertia.render(InertiaPages.ERROR_FORBIDDEN, {}),
    '500..599': (_error, { inertia, requestContext }) =>
      inertia.render(InertiaPages.ERROR_SERVER_ERROR, {
        requestId: requestContext.requestId,
      }),
  }

  override async handle(error: unknown, ctx: HttpContext): Promise<void> {
    const { request, response, session, inertia } = ctx
    const handledError = this.mapDomainException(error)
    const transport = classifyHttpTransport(ctx)

    // ----------------------------------------------------------------
    // Dev mode: Youch HTML cho non-Inertia requests
    // ----------------------------------------------------------------
    if (
      !app.inProduction &&
      handledError instanceof Error &&
      !(handledError instanceof AppException) &&
      !isHttpError(handledError)
    ) {
      if (!isInertiaRequest(request) && !isApiTransport(transport)) {
        const youch = new Youch()
        const html = await youch.toHTML(handledError)
        response
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .header('content-type', 'text/html')
          .send(html)
        return
      }
    }

    // ----------------------------------------------------------------
    // API requests: Luôn trả JSON chuẩn
    // ----------------------------------------------------------------
    if (isApiTransport(transport)) {
      const status = isHttpError(handledError)
        ? handledError.status
        : HttpStatus.INTERNAL_SERVER_ERROR
      const code = isHttpError(handledError)
        ? (handledError.code ?? this.getErrorCodeFromStatus(handledError.status))
        : ErrorCode.INTERNAL
      const message = this.getSafeClientMessage(handledError, status)
      const category = handledError instanceof AppException ? handledError.category : undefined
      const retryable =
        handledError instanceof AppException
          ? handledError.retryable && requestAllowsAutomaticRetry(request)
          : false

      // Custom ValidationException (từ DTOs/Actions) — có .errors field
      if (
        handledError instanceof ValidationException &&
        Object.keys(handledError.errors).length > 0
      ) {
        emitApiError(ctx, {
          transport,
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code,
          detail: message,
          ...(category !== undefined ? { category } : {}),
          retryable,
          errors: handledError.errors,
          includeLegacyMeta: true,
        })
        return
      }

      // VineJS validation errors — có .messages field
      if (
        isHttpError(handledError) &&
        handledError.status === HttpStatus.UNPROCESSABLE_ENTITY &&
        'messages' in handledError
      ) {
        const errors = this.flattenValidationErrors(handledError.messages)

        emitApiError(ctx, {
          transport,
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: ErrorCode.VALIDATION,
          detail: ErrorMessages.INVALID_INPUT,
          errors,
          includeLegacyMeta: true,
        })
        return
      }

      // RateLimitException — thêm Retry-After header
      if (handledError instanceof RateLimitException && handledError.retryAfter) {
        response.header('Retry-After', String(handledError.retryAfter))
      } else if (hasDefaultHeaders(handledError)) {
        applyDefaultHeaders(response, handledError)
      }

      emitApiError(ctx, {
        transport,
        status,
        code,
        detail: message,
        ...(category !== undefined ? { category } : {}),
        retryable,
        includeLegacyMeta: true,
      })
      return
    }

    // ----------------------------------------------------------------
    // 419 — CSRF Token Expired
    // ----------------------------------------------------------------
    if (isHttpError(handledError) && handledError.status === HttpStatus.CSRF_EXPIRED) {
      session.flash('errors', { form: ErrorMessages.CSRF_EXPIRED })
      response.redirect().back()
      return
    }

    // ----------------------------------------------------------------
    // 401 — Unauthorized
    // ----------------------------------------------------------------
    if (isHttpError(handledError) && handledError.status === HttpStatus.UNAUTHORIZED) {
      if (isInertiaRequest(request)) {
        inertia.location(AuthRoutes.LOGIN)
        return
      }
      session.flash('errors', { form: ErrorMessages.PLEASE_LOGIN })
      response.redirect(AuthRoutes.LOGIN)
      return
    }

    // ----------------------------------------------------------------
    // 403 — Forbidden
    // ----------------------------------------------------------------
    if (isHttpError(handledError) && handledError.status === HttpStatus.FORBIDDEN) {
      const message = this.getSafeClientMessage(handledError, HttpStatus.FORBIDDEN)
      response.status(HttpStatus.FORBIDDEN)
      await inertia.render(InertiaPages.ERROR_FORBIDDEN, { message })
      return
    }

    // ----------------------------------------------------------------
    // 404 — Not Found
    // ----------------------------------------------------------------
    if (isHttpError(handledError) && handledError.status === HttpStatus.NOT_FOUND) {
      await super.handle(handledError, ctx)
      return
    }

    // ----------------------------------------------------------------
    // 422 — Validation Error (VineJS + custom ValidationException)
    // ----------------------------------------------------------------
    if (isHttpError(handledError) && handledError.status === HttpStatus.UNPROCESSABLE_ENTITY) {
      if (handledError instanceof ValidationException) {
        session.flash('errors', handledError.errors)
        response.redirect().back()
        return
      }
      // VineJS validation errors — để AdonisJS xử lý mặc định (flash messages)
      await super.handle(handledError, ctx)
      return
    }

    // ----------------------------------------------------------------
    // 400 — Business Logic Error (BusinessLogicException)
    // ----------------------------------------------------------------
    if (isHttpError(handledError) && handledError.status === HttpStatus.BAD_REQUEST) {
      const message = handledError.message ?? ErrorMessages.GENERIC_ERROR

      // Special case: require organization → redirect to organizations page
      if (
        handledError instanceof BusinessLogicException &&
        message === ErrorMessages.REQUIRE_ORGANIZATION
      ) {
        session.put('show_organization_required_modal', true)
        if (isInertiaRequest(request)) {
          inertia.location('/organizations')
          return
        }
        response.redirect('/organizations')
        return
      }

      session.flash('error', message)
      response.redirect().back()
      return
    }

    // ----------------------------------------------------------------
    // 409 — Conflict
    // ----------------------------------------------------------------
    if (isHttpError(handledError) && handledError.status === HttpStatus.CONFLICT) {
      const message = handledError.message ?? ErrorMessages.ALREADY_EXISTS
      session.flash('error', message)
      response.redirect().back()
      return
    }

    // ----------------------------------------------------------------
    // 429 — Rate Limit Exceeded
    // ----------------------------------------------------------------
    if (isHttpError(handledError) && handledError.status === HttpStatus.RATE_LIMIT) {
      const retryAfter =
        handledError instanceof RateLimitException ? handledError.retryAfter : undefined
      const message = handledError.message ?? ErrorMessages.RATE_LIMIT

      if (retryAfter) {
        response.header('Retry-After', String(retryAfter))
      } else if (hasDefaultHeaders(handledError)) {
        applyDefaultHeaders(response, handledError)
      }

      session.flash('error', message)
      response.redirect().back()
      return
    }

    await super.handle(handledError, ctx)
  }

  override report(error: unknown, ctx: HttpContext): Promise<void> {
    try {
      this.reportException(error, ctx)
    } catch {
      // Reporting is a best-effort side effect. A hostile thrown object, broken
      // serializer, or unavailable telemetry dependency must never replace the
      // original HTTP failure with a recursive exception-handler failure.
      loggerService.warn('[HttpException] Reporter failed safely')
    }
    return Promise.resolve()
  }

  private reportException(error: unknown, ctx: HttpContext): void {
    const mappedError = this.mapDomainException(error)
    const reportableError =
      mappedError instanceof Error ? mappedError : new Error('A non-Error value was thrown')
    const statusCode = isHttpError(reportableError)
      ? reportableError.status
      : HttpStatus.INTERNAL_SERVER_ERROR
    const errorCode = isHttpError(reportableError)
      ? (reportableError.code ?? this.getErrorCodeFromStatus(statusCode))
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

    if (this.shouldPersistErrorEvent(reportableError, statusCode, errorCode)) {
      this.persistErrorEvent(reportableError, ctx, statusCode, errorCode)
    }

    // This handler is the single reporting owner. Calling super.report here would
    // emit the same exception a second time through the Adonis logger.
  }

  // ================================================================
  // Private Helpers
  // ================================================================

  /**
   * Map HTTP status code sang ErrorCode string
   */
  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BUSINESS_LOGIC
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND
      case HttpStatus.METHOD_NOT_ALLOWED:
        return ErrorCode.METHOD_NOT_ALLOWED
      case HttpStatus.REQUEST_TIMEOUT:
        return ErrorCode.REQUEST_TIMEOUT
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return ErrorCode.PAYLOAD_TOO_LARGE
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return ErrorCode.UNSUPPORTED_MEDIA_TYPE
      case HttpStatus.CSRF_EXPIRED:
        return ErrorCode.CSRF_EXPIRED
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.VALIDATION
      case HttpStatus.RATE_LIMIT:
        return ErrorCode.RATE_LIMIT
      case HttpStatus.BAD_GATEWAY:
        return ErrorCode.BAD_GATEWAY
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE
      case HttpStatus.GATEWAY_TIMEOUT:
        return ErrorCode.GATEWAY_TIMEOUT
      default:
        return ErrorCode.INTERNAL
    }
  }

  private getSafeClientMessage(error: unknown, status: number): string {
    if (error instanceof AppException) {
      return error.safeMessage
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      switch (status) {
        case HttpStatus.BAD_GATEWAY:
          return ErrorMessages.BAD_GATEWAY
        case HttpStatus.SERVICE_UNAVAILABLE:
          return ErrorMessages.SERVICE_UNAVAILABLE
        case HttpStatus.GATEWAY_TIMEOUT:
          return ErrorMessages.GATEWAY_TIMEOUT
        default:
          return ErrorMessages.INTERNAL_ERROR
      }
    }

    switch (status) {
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorMessages.INVALID_INPUT
      case HttpStatus.UNAUTHORIZED:
        return ErrorMessages.PLEASE_LOGIN
      case HttpStatus.FORBIDDEN:
        return ErrorMessages.FORBIDDEN
      case HttpStatus.NOT_FOUND:
        return ErrorMessages.NOT_FOUND
      case HttpStatus.METHOD_NOT_ALLOWED:
        return ErrorMessages.METHOD_NOT_ALLOWED
      case HttpStatus.REQUEST_TIMEOUT:
        return ErrorMessages.REQUEST_TIMEOUT
      case HttpStatus.CONFLICT:
        return ErrorMessages.ALREADY_EXISTS
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return ErrorMessages.PAYLOAD_TOO_LARGE
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return ErrorMessages.UNSUPPORTED_MEDIA_TYPE
      case HttpStatus.CSRF_EXPIRED:
        return ErrorMessages.CSRF_EXPIRED
      case HttpStatus.RATE_LIMIT:
        return ErrorMessages.RATE_LIMIT
      default:
        return ErrorMessages.GENERIC_ERROR
    }
  }

  private shouldPersistErrorEvent(error: Error, status: number, errorCode: string): boolean {
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

  private persistErrorEvent(
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
          : this.getSafeClientMessage(error, statusCode)
      const details = sanitizeErrorDetails({
        errorName: error.name,
        stack: sanitizeErrorStack(error.stack),
        retryable: error instanceof AppException ? error.retryable : false,
        context: error instanceof AppException ? (error.details ?? null) : null,
      })

      this.errorEvents.enqueue({
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

  private mapDomainException(error: unknown): unknown {
    const postgresException = PostgresException.from(error)
    if (postgresException !== null) {
      return postgresException
    }

    if (!isPolicyViolationException(error)) {
      return error
    }

    if (error.policyCode === 'FORBIDDEN') {
      return new ForbiddenException(error.reason)
    }

    return new BusinessLogicException(error.reason)
  }

  /**
   * Flatten VineJS validation errors thành Record<string, string>
   */
  private flattenValidationErrors(messages: unknown): Record<string, string> {
    const errors: Record<string, string> = {}

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (msg && typeof msg === 'object' && 'field' in msg && 'message' in msg) {
          const msgRecord = msg as Record<string, unknown>
          errors[String(msgRecord['field'])] = String(msgRecord['message'])
        }
      }
    } else if (messages && typeof messages === 'object') {
      for (const [key, value] of Object.entries(messages as Record<string, unknown>)) {
        if (typeof value === 'string') {
          errors[key] = value
        } else if (Array.isArray(value) && value.length > 0) {
          errors[key] = String(value[0])
        }
      }
    }

    return errors
  }
}
