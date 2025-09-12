import { ExceptionHandler } from '@adonisjs/core/http'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import { Youch } from 'youch'

import { createApiV1ProblemDetails } from '../../../contracts/api/v1/errors.js'

import { isPolicyViolationException } from '#modules/authorization/exceptions/policy_violation_exception'
import { HttpStatus, ErrorCode, ErrorMessages, createApiError } from '#modules/errors/public_contracts/error_constants'
import { createErrorEvent } from '#modules/errors/public_contracts/error_event_repository'
import AppException from '#modules/http/exceptions/app_exception'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import RateLimitException from '#modules/http/exceptions/rate_limit_exception'
import ValidationException from '#modules/http/exceptions/validation_exception'
import { AuthRoutes, InertiaPages } from '#modules/http/public_contracts/route_constants'
import loggerService from '#modules/logger/public_contracts/logger_service'

interface HttpError {
  status: number
  code?: string
  message?: string
  messages?: unknown
}

interface ErrorWithDefaultHeaders {
  getDefaultHeaders(): Record<string, unknown>
}

/**
 * Kiểm tra xem error có phải là HTTP error (có status code)
 */
const isHttpError = (err: unknown): err is HttpError => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as HttpError).status === 'number'
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
 * Kiểm tra xem request có phải là API request không
 * - URL bắt đầu bằng /api/
 * - Hoặc client Accept JSON nhưng KHÔNG phải Inertia (AJAX thuần)
 */
const isApiRequest = (request: HttpContext['request']): boolean => {
  if (request.url().startsWith('/api/')) return true
  if (request.header('X-Inertia')) return false
  return request.accepts(['json', 'html']) === 'json'
}

const isApiV1Request = (request: HttpContext['request']): boolean => {
  return request.url().startsWith('/api/v1')
}

/**
 * Kiểm tra xem request có phải là Inertia request không
 */
const isInertiaRequest = (request: HttpContext['request']): boolean => {
  return !!request.header('X-Inertia')
}

export default class HttpExceptionHandler extends ExceptionHandler {
  protected override debug = !app.inProduction
  protected override renderStatusPages = true

  protected override statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (_error, { inertia }) => inertia.render(InertiaPages.ERROR_NOT_FOUND, {}),
    '403': (_error, { inertia }) => inertia.render(InertiaPages.ERROR_FORBIDDEN, {}),
    '500..599': (error, { inertia }) => inertia.render(InertiaPages.ERROR_SERVER_ERROR, { error }),
  }

  override async handle(error: unknown, ctx: HttpContext): Promise<void> {
    const { request, response, session, inertia } = ctx
    const handledError = this.mapDomainException(error)
    const apiMeta = this.getApiErrorMeta(ctx)

    // ----------------------------------------------------------------
    // Dev mode: Youch HTML cho non-Inertia requests
    // ----------------------------------------------------------------
    if (!app.inProduction && handledError instanceof Error) {
      if (!isInertiaRequest(request) && !isApiRequest(request)) {
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
    if (isApiRequest(request)) {
      const status = isHttpError(handledError)
        ? handledError.status
        : HttpStatus.INTERNAL_SERVER_ERROR
      const code = isHttpError(handledError)
        ? (handledError.code ?? this.getErrorCodeFromStatus(handledError.status))
        : ErrorCode.INTERNAL
      const message = isHttpError(handledError)
        ? (handledError.message ?? ErrorMessages.GENERIC_ERROR)
        : ErrorMessages.INTERNAL_ERROR

      // Custom ValidationException (từ DTOs/Actions) — có .errors field
      if (handledError instanceof AppException && Object.keys(handledError.errors).length > 0) {
        if (isApiV1Request(request)) {
          response
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .header('content-type', 'application/problem+json')
            .json(
              createApiV1ProblemDetails({
                status: HttpStatus.UNPROCESSABLE_ENTITY,
                code,
                detail: message,
                errors: handledError.errors,
                requestId: ctx.requestContext.requestId,
                correlationId: ctx.requestContext.correlationId,
              })
            )
          return
        }

        response
          .status(HttpStatus.UNPROCESSABLE_ENTITY)
          .json(createApiError(code, message, handledError.errors, apiMeta))
        return
      }

      // VineJS validation errors — có .messages field
      if (
        isHttpError(handledError) &&
        handledError.status === HttpStatus.UNPROCESSABLE_ENTITY &&
        'messages' in handledError
      ) {
        const errors = this.flattenValidationErrors(handledError.messages)

        if (isApiV1Request(request)) {
          response
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .header('content-type', 'application/problem+json')
            .json(
              createApiV1ProblemDetails({
                status: HttpStatus.UNPROCESSABLE_ENTITY,
                code: ErrorCode.VALIDATION,
                detail: ErrorMessages.INVALID_INPUT,
                errors,
                requestId: ctx.requestContext.requestId,
                correlationId: ctx.requestContext.correlationId,
              })
            )
          return
        }

        response
          .status(HttpStatus.UNPROCESSABLE_ENTITY)
          .json(
            createApiError(
              ErrorCode.VALIDATION,
              ErrorMessages.INVALID_INPUT,
              errors,
              apiMeta
            )
          )
        return
      }

      // RateLimitException — thêm Retry-After header
      if (handledError instanceof RateLimitException && handledError.retryAfter) {
        response.header('Retry-After', String(handledError.retryAfter))
      } else if (hasDefaultHeaders(handledError)) {
        applyDefaultHeaders(response, handledError)
      }

      if (isApiV1Request(request)) {
        response
          .status(status)
          .header('content-type', 'application/problem+json')
          .json(
            createApiV1ProblemDetails({
              status,
              code,
              detail: message,
              requestId: ctx.requestContext.requestId,
              correlationId: ctx.requestContext.correlationId,
            })
          )
        return
      }

      response.status(status).json(createApiError(code, message, undefined, apiMeta))
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
      session.flash('errors', { form: ErrorMessages.FORBIDDEN_ACTION })
      response.redirect().back()
      return
    }

    // ----------------------------------------------------------------
    // 404 — Not Found
    // ----------------------------------------------------------------
    if (isHttpError(handledError) && handledError.status === HttpStatus.NOT_FOUND) {
      const message = handledError.message ?? ErrorMessages.NOT_FOUND
      session.flash('error', message)
      response.redirect().back()
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
      const retryAfter = handledError instanceof RateLimitException ? handledError.retryAfter : undefined
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

  override async report(error: unknown, ctx: HttpContext): Promise<void> {
    if (!app.inProduction && error instanceof Error) {
      const youch = new Youch()
      const output = await youch.toANSI(error)
      console.error(output)
    }

    // Structured logging cho production
    if (error instanceof Error) {
      const statusCode = isHttpError(error) ? error.status : 500
      const errorCode = isHttpError(error) ? (error as HttpError).code : undefined
      const shouldReport = error instanceof AppException ? error.shouldReport : statusCode >= 500

      // Không log 4xx errors (client errors) ở mức error, chỉ log 5xx
      if (shouldReport) {
        loggerService.error(`[HttpException] ${error.message}`, {
          code: errorCode,
          status: statusCode,
          url: ctx.request.url(),
          method: ctx.request.method(),
          userId: ctx.auth.user?.id ?? 'anonymous',
          stack: error.stack,
        })
      } else {
        loggerService.warn(`[HttpException] ${error.message}`, {
          code: errorCode,
          status: statusCode,
          url: ctx.request.url(),
          method: ctx.request.method(),
        })
      }

      if (this.shouldPersistErrorEvent(error, statusCode)) {
        await this.persistErrorEvent(error, ctx, statusCode, errorCode ?? ErrorCode.INTERNAL)
      }
    }

    await super.report(error, ctx)
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
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.VALIDATION
      case HttpStatus.RATE_LIMIT:
        return ErrorCode.RATE_LIMIT
      default:
        return ErrorCode.INTERNAL
    }
  }

  private getApiErrorMeta(ctx: HttpContext): { request_id?: string; correlation_id?: string } {
    return {
      request_id: ctx.requestContext.requestId,
      correlation_id: ctx.requestContext.correlationId,
    }
  }

  private shouldPersistErrorEvent(error: Error, status: number): boolean {
    if (error instanceof AppException) {
      return error.shouldReport
    }

    return status >= 500 || status === HttpStatus.RATE_LIMIT
  }

  private async persistErrorEvent(
    error: Error,
    ctx: HttpContext,
    statusCode: number,
    errorCode: string
  ): Promise<void> {
    try {
      await createErrorEvent({
        code: errorCode,
        status: statusCode,
        severity: statusCode >= 500 ? 'error' : 'warning',
        message: error.message,
        safe_message: statusCode >= 500 ? ErrorMessages.INTERNAL_ERROR : error.message,
        details: {
          stack: error.stack ?? null,
          ...(error instanceof AppException && error.details ? error.details : {}),
        },
        request_id: ctx.requestContext.requestId,
        correlation_id: ctx.requestContext.correlationId,
        actor_user_id: ctx.auth.user?.id ?? null,
        actor_org_id: (ctx.session.get('current_organization_id') as string | undefined) ?? null,
        method: ctx.request.method(),
        url: ctx.request.url(),
        ip_address: ctx.request.ip(),
        user_agent: ctx.request.header('user-agent') ?? null,
      })
    } catch (persistError) {
      loggerService.warn('[HttpException] Failed to persist error event', {
        originalCode: errorCode,
        originalStatus: statusCode,
        persistError: persistError instanceof Error ? persistError.message : String(persistError),
      })
    }
  }

  private mapDomainException(error: unknown): unknown {
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
          errors[String(msgRecord.field)] = String(msgRecord.message)
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
