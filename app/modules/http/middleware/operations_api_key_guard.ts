import { timingSafeEqual } from 'node:crypto'

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { ErrorCode, HttpStatus } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'

export async function enforceOperationsApiKey(
  ctx: HttpContext,
  next: NextFn,
  expectedApiKey: string | undefined,
  unavailableDetail: string
): Promise<void> {
  if (!expectedApiKey) {
    emitApiError(ctx, {
      transport: 'api-ops-internal',
      status: HttpStatus.SERVICE_UNAVAILABLE,
      code: ErrorCode.INTERNAL,
      detail: unavailableDetail,
    })
    return
  }

  const apiKey = ctx.request.header('x-api-key')
  if (!apiKey) {
    throw new UnauthorizedException('API key không hợp lệ hoặc bị thiếu')
  }

  const apiKeyBuffer = Buffer.from(apiKey, 'utf8')
  const expectedBuffer = Buffer.from(expectedApiKey, 'utf8')
  if (
    apiKeyBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(apiKeyBuffer, expectedBuffer)
  ) {
    throw new UnauthorizedException('API key không hợp lệ hoặc bị thiếu')
  }

  await next()
}
