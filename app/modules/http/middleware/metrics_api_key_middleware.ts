import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { enforceOperationsApiKey } from './operations_api_key_guard.js'

import env from '#start/env'

/**
 * Dedicated collector credential. It deliberately does not reuse the health
 * probe secret, so scrape access can be rotated and revoked independently.
 */
export default class MetricsApiKeyMiddleware {
  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    await enforceOperationsApiKey(
      ctx,
      next,
      env.get('METRICS_API_KEY'),
      'Metrics API key chưa được cấu hình'
    )
  }
}
