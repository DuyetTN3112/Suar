import type { HttpContext } from '@adonisjs/core/http'

import {
  createApiV1ProblemDetails,
  type ApiV1ProblemCategory,
} from '../../../contracts/api/v1/errors.js'

import type { HttpTransportKind } from './http_transport.js'

import { createApiError } from '#modules/errors/public_contracts/error_constants'

interface EmitApiErrorInput {
  transport: HttpTransportKind
  status: number
  code: string
  detail: string
  category?: ApiV1ProblemCategory
  retryable?: boolean
  errors?: Record<string, string>
  violations?: ReadonlyArray<{
    field: string
    pointer: string
    message: string
    code: string
  }>
  redirectTo?: string
  includeLegacyMeta?: boolean
}

export function emitApiError(ctx: HttpContext, input: EmitApiErrorInput): void {
  if (input.transport === 'api-canonical') {
    ctx.response
      .status(input.status)
      .header('content-type', 'application/problem+json')
      .json(
        createApiV1ProblemDetails({
          status: input.status,
          code: input.code,
          detail: input.detail,
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.retryable !== undefined ? { retryable: input.retryable } : {}),
          requestId: ctx.requestContext.requestId,
          correlationId: ctx.requestContext.correlationId,
          ...(input.errors !== undefined ? { errors: input.errors } : {}),
          ...(input.violations !== undefined ? { violations: input.violations } : {}),
        })
      )
    return
  }

  const includeLegacyMeta = input.includeLegacyMeta ?? true
  ctx.response.status(input.status).json({
    ...createApiError(
      input.code,
      input.detail,
      input.errors,
      includeLegacyMeta
        ? {
            request_id: ctx.requestContext.requestId,
            correlation_id: ctx.requestContext.correlationId,
          }
        : undefined
    ),
    ...(input.redirectTo ? { redirectTo: input.redirectTo } : {}),
  })
}
