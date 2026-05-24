import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import DetectUserLocaleMiddleware from '#modules/http/middleware/detect_user_locale_middleware'

function toHttpContext(value: unknown): HttpContext {
  return value as HttpContext
}

test.group('DetectUserLocaleMiddleware Inertia payloads', () => {
  test('shares translations in the initial Inertia response', async ({ assert }) => {
    const middleware = new DetectUserLocaleMiddleware()
    let loadCount = 0
    const runtimeMiddleware = middleware as unknown as {
      loadTranslations(locale: string): Promise<Record<string, Record<string, string>>>
    }
    runtimeMiddleware.loadTranslations = () => {
      loadCount += 1
      return Promise.resolve({ common: { ready: 'yes' } })
    }

    let sharedProps: Record<string, unknown> | undefined
    const ctx = toHttpContext({
      request: {
        input: () => undefined,
        languages: () => ['en'],
      },
      session: {
        get: () => undefined,
        put: () => undefined,
        forget: () => undefined,
      },
      containerResolver: {
        bindValue: () => undefined,
      },
      view: {
        share: () => undefined,
      },
      inertia: {
        share: (props: Record<string, unknown>) => {
          sharedProps = props
        },
      },
    })

    let nextCalled = false
    await middleware.handle(ctx, () => {
      nextCalled = true
      assert.equal(loadCount, 1)
      return Promise.resolve()
    })

    assert.isTrue(nextCalled)
    assert.equal(loadCount, 1)
    assert.deepEqual(sharedProps?.['locale'], 'en')
    assert.deepEqual(sharedProps?.['supportedLocales'], ['en', 'vi'])
    assert.deepEqual(sharedProps?.['translations'], { common: { ready: 'yes' } })
  })
})
