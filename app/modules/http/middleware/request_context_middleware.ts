import { randomUUID } from 'node:crypto'

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

interface RequestContextShape {
  requestId: string
  correlationId: string
}

export default class RequestContextMiddleware {
  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    const requestId = randomUUID()
    const inboundCorrelationId = ctx.request.header('x-correlation-id')
    const correlationId =
      typeof inboundCorrelationId === 'string' && inboundCorrelationId.trim().length > 0
        ? inboundCorrelationId.trim()
        : requestId

    ctx.requestContext = {
      requestId,
      correlationId,
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
