import { timingSafeEqual } from 'node:crypto'

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { ErrorCode, HttpStatus } from '#modules/errors/public_contracts/error_constants'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'
import env from '#start/env'

export const CACHE_ADMIN_BREAK_GLASS_HEADER = 'x-cache-admin-break-glass-token'
export const CACHE_ADMIN_BREAK_GLASS_MIN_BYTES = 32
export const CACHE_ADMIN_BREAK_GLASS_MAX_BYTES = 256

export function shouldExposeCacheValueDiagnostics(
  nodeEnvironment: 'development' | 'production' | 'test'
): boolean {
  return nodeEnvironment !== 'production'
}

export function shouldRegisterCacheAdminRoutes(
  nodeEnvironment: 'development' | 'production' | 'test',
  enabled: boolean
): boolean {
  return nodeEnvironment !== 'production' || enabled
}

function isConfiguredBreakGlassToken(value: string | undefined): value is string {
  if (!value) return false

  const byteLength = Buffer.byteLength(value, 'utf8')
  return (
    byteLength >= CACHE_ADMIN_BREAK_GLASS_MIN_BYTES &&
    byteLength <= CACHE_ADMIN_BREAK_GLASS_MAX_BYTES
  )
}

function tokenMatches(supplied: string | undefined, expected: string): boolean {
  if (!supplied) return false

  const suppliedBuffer = Buffer.from(supplied, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    suppliedBuffer.length <= CACHE_ADMIN_BREAK_GLASS_MAX_BYTES &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  )
}

/**
 * Protects the cache control plane independently from an authenticated session.
 *
 * The route remains undiscoverable while disabled, requires the built-in
 * superadmin role, and then requires a separately rotated break-glass secret.
 * Custom/system-admin roles are deliberately insufficient for cache-wide
 * operations.
 */
export default class CacheAdminAccessMiddleware {
  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    if (env.get('CACHE_ADMIN_API_ENABLED', false) !== true) {
      throw new NotFoundException()
    }

    if (ctx.auth.user?.system_role !== 'superadmin') {
      throw new ForbiddenException()
    }

    const expectedToken = env.get('CACHE_ADMIN_BREAK_GLASS_TOKEN')
    if (!isConfiguredBreakGlassToken(expectedToken)) {
      emitApiError(ctx, {
        transport: 'api-ops-internal',
        status: HttpStatus.SERVICE_UNAVAILABLE,
        code: ErrorCode.INTERNAL,
        detail: 'Cache administration credential is not configured safely',
      })
      return
    }

    const suppliedToken = ctx.request.header(CACHE_ADMIN_BREAK_GLASS_HEADER)
    if (!tokenMatches(suppliedToken, expectedToken)) {
      throw new UnauthorizedException('Cache administration credential is invalid or missing')
    }

    await next()
  }
}
