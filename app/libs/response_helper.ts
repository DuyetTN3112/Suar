import type { HttpContext } from '@adonisjs/core/http'
import type { InertiaPages } from '@adonisjs/inertia/types'

import { getErrorMessage } from '#libs/error_utils'

/**
 * ResponseHelper — Chuẩn hóa response pattern cho Controllers
 *
 * Giải quyết duplicate code pattern:
 * - `request.accepts(['html', 'json'])` check
 * - `request.header('X-Inertia')` check
 * - Flash message + redirect vs JSON response
 *
 * @module ResponseHelper
 * @example
 * ```typescript
 * // Trong controller:
 * import { respondWithSuccess, respondWithError, respondWithData } from '#libs/response_helper'
 *
 * // Success with redirect + flash
 * return respondWithSuccess(ctx, {
 *   flashMessage: 'Tạo thành công',
 *   redirectRoute: 'tasks.index',
 *   jsonData: { success: true, data: task },
 * })
 *
 * // Error handling
 * return respondWithError(ctx, error, {
 *   fallbackMessage: 'Có lỗi xảy ra',
 *   redirectBack: true,
 * })
 *
 * // Data response (Inertia or JSON)
 * return respondWithData(ctx, {
 *   inertiaPage: 'tasks/show',
 *   inertiaData: { task, permissions },
 *   jsonData: { task, permissions },
 * })
 * ```
 */

/**
 * Options for success responses
 */
export interface SuccessResponseOptions {
  /** Flash success message for session (Inertia/HTML) */
  flashMessage?: string
  /** Route name to redirect to */
  redirectRoute?: string
  /** Route params for redirect */
  redirectParams?: Record<string, string>
  /** Redirect back to previous page */
  redirectBack?: boolean
  /** JSON data for API responses */
  jsonData?: Record<string, unknown>
  /** HTTP status code for JSON (default: 200) */
  statusCode?: number
}

/**
 * Options for error responses
 */
export interface ErrorResponseOptions {
  /** Fallback error message if error is not descriptive */
  fallbackMessage?: string
  /** Redirect back to previous page on error */
  redirectBack?: boolean
  /** Route name to redirect to on error */
  redirectRoute?: string
  /** Route params for redirect */
  redirectParams?: Record<string, string>
  /** HTTP status code for JSON error (default: 500) */
  statusCode?: number
  /** Inertia page to render on error (instead of redirect) */
  inertiaErrorPage?: keyof InertiaPages
  /** Additional data to pass with Inertia error page */
  inertiaErrorData?: Record<string, unknown>
}

/**
 * Options for data responses (Inertia render or JSON)
 */
export interface DataResponseOptions {
  /** Inertia page component to render */
  inertiaPage?: keyof InertiaPages
  /** Data to pass to Inertia page */
  inertiaData?: Record<string, unknown>
  /** JSON data for API responses */
  jsonData?: Record<string, unknown>
  /** HTTP status code (default: 200) */
  statusCode?: number
}

/**
 * Check if the request expects a JSON response (API or AJAX)
 */
export function isJsonRequest(ctx: HttpContext): boolean {
  const { request } = ctx
  // Check X-Inertia header — Inertia requests are NOT pure JSON API
  if (request.header('X-Inertia')) return false
  // Check Accept header or explicit JSON format
  const accepts = request.accepts(['html', 'json'])
  return accepts === 'json' || request.header('Accept')?.includes('application/json') === true
}

/**
 * Check if the request is an Inertia request
 */
export function isInertiaRequest(ctx: HttpContext): boolean {
  return !!ctx.request.header('X-Inertia')
}

/**
 * Respond with success — handles both Inertia/HTML and JSON responses
 *
 * For Inertia/HTML: flashes success message and redirects
 * For JSON: returns success JSON with data
 */
export function respondWithSuccess(ctx: HttpContext, options: SuccessResponseOptions): void {
  const { response, session } = ctx

  if (isJsonRequest(ctx)) {
    const statusCode = options.statusCode ?? 200
    response.status(statusCode).json({
      success: true,
      message: options.flashMessage ?? 'Thao tác thành công',
      ...options.jsonData,
    })
    return
  }

  // Flash message for Inertia/HTML
  if (options.flashMessage) {
    session.flash('success', options.flashMessage)
  }

  // Redirect
  if (options.redirectBack) {
    response.redirect().back()
  } else if (options.redirectRoute) {
    if (options.redirectParams) {
      response.redirect().toRoute(options.redirectRoute, options.redirectParams)
    } else {
      response.redirect().toRoute(options.redirectRoute)
    }
  }
}

/**
 * Respond with error — handles both Inertia/HTML and JSON responses
 *
 * For Inertia/HTML: flashes error message, redirects back or to error page
 * For JSON: returns error JSON with message
 */
export function respondWithError(
  ctx: HttpContext,
  error: unknown,
  options: ErrorResponseOptions = {}
): Promise<unknown> | undefined {
  const { response, session, inertia } = ctx
  const message = getErrorMessage(error, options.fallbackMessage ?? 'Đã xảy ra lỗi')

  if (isJsonRequest(ctx)) {
    const statusCode = options.statusCode ?? 500
    response.status(statusCode).json({
      success: false,
      error: message,
    })
    return
  }

  // Inertia error page (optional)
  if (options.inertiaErrorPage) {
    return inertia.render(options.inertiaErrorPage, {
      error: message,
      ...options.inertiaErrorData,
    })
  }

  // Flash error message
  session.flash('error', message)

  // Redirect
  if (options.redirectBack !== false) {
    // Default: redirect back
    response.redirect().back()
  } else if (options.redirectRoute) {
    if (options.redirectParams) {
      response.redirect().toRoute(options.redirectRoute, options.redirectParams)
    } else {
      response.redirect().toRoute(options.redirectRoute)
    }
  }

  return undefined
}

/**
 * Respond with data — renders Inertia page or returns JSON based on request type
 *
 * For Inertia: renders the specified page with data
 * For JSON: returns JSON data
 */
export async function respondWithData(
  ctx: HttpContext,
  options: DataResponseOptions
): Promise<unknown> {
  const { response, inertia } = ctx

  if (isJsonRequest(ctx)) {
    const statusCode = options.statusCode ?? 200
    response.status(statusCode).json({
      success: true,
      ...options.jsonData,
    })
    return undefined
  }

  // Inertia render
  if (options.inertiaPage) {
    return inertia.render(options.inertiaPage, options.inertiaData ?? {})
  }

  // Fallback: return JSON if no Inertia page specified
  response.json({
    success: true,
    ...options.jsonData,
  })
  return undefined
}

/**
 * Respond with created (201) — shorthand for creation success
 */
export function respondWithCreated(ctx: HttpContext, options: SuccessResponseOptions): void {
  respondWithSuccess(ctx, {
    ...options,
    statusCode: options.statusCode ?? 201,
  })
}

/**
 * Respond with no content (204) — shorthand for deletion success
 */
export function respondWithDeleted(
  ctx: HttpContext,
  options: Omit<SuccessResponseOptions, 'jsonData' | 'statusCode'> & {
    jsonData?: Record<string, unknown>
  }
): void {
  if (isJsonRequest(ctx)) {
    ctx.response.status(200).json({
      success: true,
      message: options.flashMessage ?? 'Đã xóa thành công',
      ...options.jsonData,
    })
    return
  }

  respondWithSuccess(ctx, options)
}
