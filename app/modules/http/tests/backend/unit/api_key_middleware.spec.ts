import { test } from '@japa/runner'

import ApiKeyMiddleware from '#modules/http/middleware/api_key_middleware'
import env from '#start/env'

test.group('ApiKeyMiddleware', () => {
  test('returns shared ops error payload when health check API key is not configured', async ({
    assert,
  }) => {
    const middleware = new ApiKeyMiddleware()
    const responseState = {
      statusCode: 200,
      payload: null as unknown,
    }

    const originalGet = env.get.bind(env)
    ;(env as typeof env & { get: typeof env.get }).get = ((key: string, defaultValue?: unknown) => {
      if (key === 'HEALTH_CHECK_API_KEY') {
        return undefined
      }
      return originalGet(key as never, defaultValue as never)
    }) as typeof env.get

    try {
      const ctx = {
        requestContext: {
          requestId: 'req_health_1',
          correlationId: 'corr_health_1',
        },
        request: {
          header: () => null,
          accepts: () => 'json',
        },
        response: {
          status(code: number) {
            responseState.statusCode = code
            return this
          },
          json(payload: unknown) {
            responseState.payload = payload
            return this
          },
        },
      }

      let nextCalled = false
      await middleware.handle(ctx as never, () => {
        nextCalled = true
        return Promise.resolve()
      })

      assert.isFalse(nextCalled)
      assert.equal(responseState.statusCode, 503)
      assert.deepEqual(responseState.payload, {
        success: false,
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Health check API key chưa được cấu hình',
        },
        meta: {
          request_id: 'req_health_1',
          correlation_id: 'corr_health_1',
        },
      })
    } finally {
      ;(env as typeof env & { get: typeof env.get }).get = originalGet
    }
  })
})
