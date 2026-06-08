import { test } from '@japa/runner'

import BindHttpTransportMiddleware from '#modules/http/middleware/bind_http_transport_middleware'

function makeContext(existingTransport?: 'api-compat' | 'api-ops-internal') {
  return {
    httpTransportKind: existingTransport,
    request: { url: () => '/api/search' },
    response: { header: () => undefined },
  } as never
}

test.group('Unit | Bind HTTP transport middleware', () => {
  test('rejects conflicting nested transport bindings before downstream execution', async ({
    assert,
  }) => {
    let nextCalls = 0
    const middleware = new BindHttpTransportMiddleware()

    await assert.rejects(
      () =>
        middleware.handle(
          makeContext('api-compat'),
          () => {
            nextCalls += 1
            return Promise.resolve()
          },
          'api-ops-internal'
        ),
      /Conflicting HTTP transport bindings: api-compat -> api-ops-internal/
    )
    assert.equal(nextCalls, 0)
  })

  test('allows an idempotent binding', async ({ assert }) => {
    let nextCalls = 0
    const middleware = new BindHttpTransportMiddleware()

    await middleware.handle(
      makeContext('api-ops-internal'),
      () => {
        nextCalls += 1
        return Promise.resolve()
      },
      'api-ops-internal'
    )

    assert.equal(nextCalls, 1)
  })
})
