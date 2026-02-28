import app from '@adonisjs/core/services/app'
import { ExceptionHandler } from '@adonisjs/core/http'
import type { HttpContext } from '@adonisjs/core/http'

import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import Youch from 'youch'
import YouchTerminal from 'youch-terminal'
import loggerService from '#services/logger_service'
import { HttpStatus, ErrorCode, ErrorMessages, createApiError } from '#constants/error_constants'
import { AuthRoutes, InertiaPages } from '#constants/route_constants'
import ValidationException from '#exceptions/validation_exception'
import RateLimitException from '#exceptions/rate_limit_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

interface HttpError {
  status: number
  code?: string
  message?: string
  messages?: unknown
}

interface YouchInstance {
  toHTML: () => Promise<string>
  toJSON: () => Promise<Record<string, unknown>>
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

/**
 * Kiểm tra xem request có phải là API request không
 */
const isApiRequest = (request: HttpContext['request']): boolean => {
  return request.url().startsWith('/api/')
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
    '404': (_error, { inertia }) => inertia.render(InertiaPages.ERROR_NOT_FOUND),
    '403': (_error, { inertia }) => inertia.render(InertiaPages.ERROR_FORBIDDEN),
    '500..599': (error, { inertia }) => inertia.render(InertiaPages.ERROR_SERVER_ERROR, { error }),
  }

  override async handle(error: unknown, ctx: HttpContext): Promise<void> {
    const { request, response, session, inertia } = ctx

    // ----------------------------------------------------------------
    // Dev mode: Youch HTML cho non-Inertia requests
    // ----------------------------------------------------------------
    if (!app.inProduction && error instanceof Error) {
      if (!isInertiaRequest(request) || isApiRequest(request)) {
        const youch = new Youch(error, request.request) as unknown as YouchInstance
        const html = await youch.toHTML()
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
    if (isApiRequest(request) && isHttpError(error)) {
      const code = error.code ?? this.getErrorCodeFromStatus(error.status)
      const message = error.message ?? ErrorMessages.GENERIC_ERROR

      // Custom ValidationException (từ DTOs/Actions) — có .errors field
      if (error instanceof ValidationException && Object.keys(error.errors).length > 0) {
        response
          .status(HttpStatus.UNPROCESSABLE_ENTITY)
          .json(createApiError(ErrorCode.VALIDATION, message, error.errors))
        return
      }

      // VineJS validation errors — có .messages field
      if (error.status === HttpStatus.UNPROCESSABLE_ENTITY && 'messages' in error) {
        response
          .status(HttpStatus.UNPROCESSABLE_ENTITY)
          .json(
            createApiError(
              ErrorCode.VALIDATION,
              ErrorMessages.INVALID_INPUT,
              this.flattenValidationErrors(error.messages)
            )
          )
        return
      }

      // RateLimitException — thêm Retry-After header
      if (error instanceof RateLimitException && error.retryAfter) {
        response.header('Retry-After', String(error.retryAfter))
      }

      response.status(error.status).json(createApiError(code, message))
      return
    }

    // ----------------------------------------------------------------
    // 419 — CSRF Token Expired
    // ----------------------------------------------------------------
    if (isHttpError(error) && error.status === HttpStatus.CSRF_EXPIRED) {
      session.flash('errors', { form: ErrorMessages.CSRF_EXPIRED })
      response.redirect().back()
      return
    }

    // ----------------------------------------------------------------
    // 401 — Unauthorized
    // ----------------------------------------------------------------
    if (isHttpError(error) && error.status === HttpStatus.UNAUTHORIZED) {
      if (isInertiaRequest(request)) {
        await inertia.location(AuthRoutes.LOGIN)
        return
      }
      session.flash('errors', { form: ErrorMessages.PLEASE_LOGIN })
      response.redirect(AuthRoutes.LOGIN)
      return
    }

    // ----------------------------------------------------------------
    // 403 — Forbidden
    // ----------------------------------------------------------------
    if (isHttpError(error) && error.status === HttpStatus.FORBIDDEN) {
      session.flash('errors', { form: ErrorMessages.FORBIDDEN_ACTION })
      response.redirect().back()
      return
    }

    // ----------------------------------------------------------------
    // 404 — Not Found
    // ----------------------------------------------------------------
    if (isHttpError(error) && error.status === HttpStatus.NOT_FOUND) {
      const message = error.message ?? ErrorMessages.NOT_FOUND
      session.flash('error', message)
      response.redirect().back()
      return
    }

    // ----------------------------------------------------------------
    // 422 — Validation Error (VineJS + custom ValidationException)
    // ----------------------------------------------------------------
    if (isHttpError(error) && error.status === HttpStatus.UNPROCESSABLE_ENTITY) {
      if (error instanceof ValidationException) {
        session.flash('errors', error.errors)
        response.redirect().back()
        return
      }
      // VineJS validation errors — để AdonisJS xử lý mặc định (flash messages)
      await super.handle(error, ctx)
      return
    }

    // ----------------------------------------------------------------
    // 400 — Business Logic Error (BusinessLogicException)
    // ----------------------------------------------------------------
    if (isHttpError(error) && error.status === HttpStatus.BAD_REQUEST) {
      const message = error.message ?? ErrorMessages.GENERIC_ERROR

      // Special case: require organization → redirect to organizations page
      if (
        error instanceof BusinessLogicException &&
        message === ErrorMessages.REQUIRE_ORGANIZATION
      ) {
        session.put('show_organization_required_modal', true)
        if (isInertiaRequest(request)) {
          await inertia.location('/organizations')
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
    if (isHttpError(error) && error.status === HttpStatus.CONFLICT) {
      const message = error.message ?? ErrorMessages.ALREADY_EXISTS
      session.flash('error', message)
      response.redirect().back()
      return
    }

    // ----------------------------------------------------------------
    // 429 — Rate Limit Exceeded
    // ----------------------------------------------------------------
    if (isHttpError(error) && error.status === HttpStatus.RATE_LIMIT) {
      const retryAfter = error instanceof RateLimitException ? error.retryAfter : undefined
      const message = error.message ?? ErrorMessages.RATE_LIMIT

      if (retryAfter) {
        response.header('Retry-After', String(retryAfter))
      }

      session.flash('error', message)
      response.redirect().back()
      return
    }

    await super.handle(error, ctx)
  }

  override async report(error: unknown, ctx: HttpContext): Promise<void> {
    if (!app.inProduction && error instanceof Error) {
      const youch = new Youch(error, ctx.request.request) as unknown as YouchInstance
      const output = await youch.toJSON()
      console.log(YouchTerminal(output))
    }

    // Structured logging cho production
    if (error instanceof Error) {
      const statusCode = isHttpError(error) ? error.status : 500
      const errorCode = isHttpError(error) ? (error as HttpError).code : undefined

      // Không log 4xx errors (client errors) ở mức error, chỉ log 5xx
      if (statusCode >= 500) {
        loggerService.error(`[HttpException] ${error.message}`, {
          code: errorCode,
          status: statusCode,
          url: ctx.request.url(),
          method: ctx.request.method(),
          userId: ctx.auth?.user?.id ?? 'anonymous',
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

  /**
   * Flatten VineJS validation errors thành Record<string, string>
   */
  private flattenValidationErrors(messages: unknown): Record<string, string> {
    const errors: Record<string, string> = {}

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (msg && typeof msg === 'object' && 'field' in msg && 'message' in msg) {
          errors[String(msg.field)] = String(msg.message)
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
