import { randomUUID } from 'node:crypto'

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

interface RequestContextShape {
  requestId: string
  correlationId: string
  traceId: string
}

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/
const TRACEPARENT_PATTERN =
  /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})(?:-.+)?$/i
const ZERO_TRACE_ID = '00000000000000000000000000000000'
const ZERO_PARENT_ID = '0000000000000000'

function resolveCorrelationId(value: string | undefined, requestId: string): string {
  const candidate = value?.trim()
  return candidate && CORRELATION_ID_PATTERN.test(candidate) ? candidate : requestId
}

function resolveTraceId(traceparent: string | undefined): string {
  const match = traceparent?.trim().match(TRACEPARENT_PATTERN)
  const version = match?.[1]?.toLowerCase()
  const traceId = match?.[2]?.toLowerCase()
  const parentId = match?.[3]?.toLowerCase()

  if (
    version &&
    version !== 'ff' &&
    traceId &&
    traceId !== ZERO_TRACE_ID &&
    parentId &&
    parentId !== ZERO_PARENT_ID
  ) {
    return traceId
  }

  return randomUUID().replaceAll('-', '')
}

export default class RequestContextMiddleware {
  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    const requestId = randomUUID()
    const correlationId = resolveCorrelationId(
      ctx.request.header('x-correlation-id'),
      requestId
    )
    const traceId = resolveTraceId(ctx.request.header('traceparent'))

    ctx.requestContext = {
      requestId,
      correlationId,
      traceId,
    }

    ctx.response.header('X-Request-Id', requestId)
    ctx.response.header('X-Correlation-Id', correlationId)

    await next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    requestContext: RequestContextShape
  }
}
