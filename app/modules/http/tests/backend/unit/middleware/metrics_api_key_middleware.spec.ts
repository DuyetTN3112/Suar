import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import MetricsApiKeyMiddleware from '#modules/http/middleware/metrics_api_key_middleware'
import env from '#start/env'

function toContext(value: unknown): HttpContext {
  return value as HttpContext
}

test.group('MetricsApiKeyMiddleware', () => {
  test('fails closed when the dedicated collector key is not configured', async ({ assert }) => {
    const originalGet = env.get.bind(env)
    const responseState = { statusCode: 200, payload: null as unknown }
    const missingMetricsKey = (key: string, defaultValue?: unknown) => {
      if (key === 'METRICS_API_KEY') return undefined
      return originalGet(key as never, defaultValue as never)
    }
    Reflect.set(env, 'get', missingMetricsKey)

    try {
      let nextCalled = false
      await new MetricsApiKeyMiddleware().handle(
        toContext({
          requestContext: {
            requestId: 'req_metrics_1',
            correlationId: 'corr_metrics_1',
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
        }),
        () => {
          nextCalled = true
          return Promise.resolve()
        }
      )

      assert.isFalse(nextCalled)
      assert.equal(responseState.statusCode, 503)
      assert.deepEqual(responseState.payload, {
        success: false,
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Metrics API key chưa được cấu hình',
        },
        meta: {
          request_id: 'req_metrics_1',
          correlation_id: 'corr_metrics_1',
        },
      })
    } finally {
      Reflect.set(env, 'get', originalGet)
    }
  })
})
