import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { enforceOperationsApiKey } from './operations_api_key_guard.js'

import env from '#start/env'

/**
 * Test fixtures run against an isolated test database, but development servers
 * may still be reachable from a network. Require an explicit credential there.
 * The test runner remains keyless so existing in-process test clients keep working.
 */
export default class TestingRoutesApiKeyMiddleware {
  public async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    if (env.get('NODE_ENV') === 'test') {
      await next()
      return
    }

    await enforceOperationsApiKey(
      ctx,
      next,
      env.get('TESTING_ROUTES_API_KEY'),
      'Testing routes API key chưa được cấu hình'
    )
  }
}
