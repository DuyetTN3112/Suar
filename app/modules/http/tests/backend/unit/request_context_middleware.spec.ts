import { test } from '@japa/runner'

import RequestContextMiddleware from '#modules/http/middleware/request_context_middleware'

function makeContext(headers: Record<string, string> = {}) {
  const responseHeaders: Record<string, string> = {}
  const ctx = {
    request: {
      header: (name: string) => headers[name.toLowerCase()],
    },
    response: {
      header(name: string, value: string) {
        responseHeaders[name.toLowerCase()] = value
        return this
      },
    },
  }

  return { ctx, responseHeaders }
}

test.group('RequestContextMiddleware', () => {
  test('creates one server request id and propagates a valid W3C trace id', async ({ assert }) => {
    const middleware = new RequestContextMiddleware()
    const { ctx, responseHeaders } = makeContext({
      'x-correlation-id': 'workflow:task-update.42',
      traceparent: '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
    })
    let nextCallCount = 0

    await middleware.handle(ctx as never, () => {
      nextCallCount += 1
      return Promise.resolve()
    })

    const requestContext = (ctx as typeof ctx & {
      requestContext: { requestId: string; correlationId: string; traceId: string }
    }).requestContext

    assert.equal(nextCallCount, 1)
    assert.match(requestContext.requestId, /^[0-9a-f-]{36}$/)
    assert.equal(requestContext.correlationId, 'workflow:task-update.42')
    assert.equal(requestContext.traceId, '0123456789abcdef0123456789abcdef')
    assert.equal(responseHeaders['x-request-id'], requestContext.requestId)
    assert.equal(responseHeaders['x-correlation-id'], requestContext.correlationId)
  })

  test('rejects unbounded correlation ids and invalid traceparent values', async ({ assert }) => {
    const middleware = new RequestContextMiddleware()
    const { ctx } = makeContext({
      'x-correlation-id': 'x'.repeat(129),
      traceparent: '00-00000000000000000000000000000000-0000000000000000-01',
    })

    await middleware.handle(ctx as never, () => Promise.resolve())

    const requestContext = (ctx as typeof ctx & {
      requestContext: { requestId: string; correlationId: string; traceId: string }
    }).requestContext

    assert.equal(requestContext.correlationId, requestContext.requestId)
    assert.match(requestContext.traceId, /^[0-9a-f]{32}$/)
    assert.notEqual(requestContext.traceId, '00000000000000000000000000000000')
  })
})
