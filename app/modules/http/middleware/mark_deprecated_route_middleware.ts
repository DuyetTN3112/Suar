import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export interface DeprecatedRoutePolicy {
  replacementPath: string
  sunsetDate?: string
}

export default class MarkDeprecatedRouteMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    policy: DeprecatedRoutePolicy
  ): Promise<void> {
    const sunsetDate = policy.sunsetDate ?? '2026-12-31'

    ctx.response.header('Deprecation', 'true')
    ctx.response.header('Sunset', sunsetDate)
    ctx.response.header('Link', `<${policy.replacementPath}>; rel="successor-version"`)
    ctx.response.header(
      'Warning',
      `299 - "Deprecated API route. Migrate to ${policy.replacementPath} before ${sunsetDate}."`
    )

    await next()
  }
}
