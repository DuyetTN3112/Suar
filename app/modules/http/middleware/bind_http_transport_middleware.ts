import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { resolveCompatApiDeprecation } from '#modules/http/boundary/compat_api_deprecation'
import type { HttpTransportKind } from '#modules/http/boundary/http_transport'

export default class BindHttpTransportMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    transport: HttpTransportKind
  ): Promise<void> {
    ctx.httpTransportKind = transport
    await next()

    if (transport !== 'api-compat') {
      return
    }

    const deprecation = resolveCompatApiDeprecation(ctx.request.url())
    if (!deprecation) {
      return
    }

    ctx.response.header('Deprecation', 'true')
    ctx.response.header('Sunset', deprecation.sunsetDate)
    ctx.response.header('Link', `<${deprecation.replacementPath}>; rel="successor-version"`)
    ctx.response.header(
      'Warning',
      `299 - "Deprecated API route. Migrate to ${deprecation.replacementPath} before ${deprecation.sunsetDate}."`
    )
  }
}
