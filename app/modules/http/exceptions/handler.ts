import { inject } from '@adonisjs/core'
import { ExceptionHandler } from '@adonisjs/core/http'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import { Youch } from 'youch'

import {
  applyDefaultHeaders,
  flattenValidationErrors,
  getErrorCodeFromStatus,
  getSafeClientMessage,
  hasDefaultHeaders,
  isHttpError,
  isInertiaRequest,
  mapDomainException,
  requestAllowsAutomaticRetry,
} from './http_exception_metadata.js'
import { reportHttpException } from './http_exception_reporter.js'

import AppException from '#modules/errors/public_contracts/application_exception'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import {
  ErrorCode,
  ErrorMessages,
  HttpStatus,
} from '#modules/errors/public_contracts/error_constants'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { HttpErrorEventReporter } from '#modules/http/actions/ports/outbound/http_error_event_reporter'
import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'
import { classifyHttpTransport, isApiTransport } from '#modules/http/boundary/http_transport'
import { mapValidationIssues } from '#modules/http/boundary/validation_error_mapper'
import RateLimitException from '#modules/http/exceptions/rate_limit_exception'
import { AuthRoutes, InertiaPages } from '#modules/http/public_contracts/route_constants'
import loggerService from '#modules/logger/public_contracts/application_logger'

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
    const handledError = mapDomainException(error)
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
      if (!isHttpError(handledError) || handledError.status === 500) {
        console.error('API TRANSPORT 500 ERROR:', error)
      }
      const status = isHttpError(handledError)
        ? handledError.status
        : HttpStatus.INTERNAL_SERVER_ERROR
      const code = isHttpError(handledError)
        ? (handledError.code ?? getErrorCodeFromStatus(handledError.status))
        : ErrorCode.INTERNAL
      const message = getSafeClientMessage(handledError, status)
      const category = handledError instanceof AppException ? handledError.category : undefined
      const retryable =
        handledError instanceof AppException
          ? handledError.retryable && requestAllowsAutomaticRetry(request)
          : false

      // Custom ValidationException (từ DTOs/Actions) — có .errors field
      if (
        handledError instanceof ValidationException &&
        handledError.issues.length > 0
      ) {
        const mapped = mapValidationIssues(handledError.issues)
        emitApiError(ctx, {
          transport,
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code,
          detail: message,
          ...(category !== undefined ? { category } : {}),
          retryable,
          errors: mapped.errors,
          violations: mapped.violations,
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
        const errors = flattenValidationErrors(handledError.messages)

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
      const message = getSafeClientMessage(handledError, HttpStatus.FORBIDDEN)
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
      reportHttpException(this.errorEvents, error, ctx)
    } catch {
      // Reporting is a best-effort side effect. A hostile thrown object, broken
      // serializer, or unavailable telemetry dependency must never replace the
      // original HTTP failure with a recursive exception-handler failure.
      loggerService.warn('[HttpException] Reporter failed safely')
    }
    return Promise.resolve()
  }
}
