import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { test } from '@japa/runner'

import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import { singleFlight } from '#modules/cache/public_contracts/cache_store'
import CacheMiddleware from '#modules/http/middleware/cache_middleware'

interface FakeResponse {
  body: unknown
  statusCode: number
  headers: Map<string, unknown>
  getBody(): unknown
  getStatus(): number
  getHeader(name: string): unknown
  header(name: string, value: unknown): void
  send(body: unknown): void
  status(statusCode: number): FakeResponse
}

function createContext(
  options: {
    url?: string
    language?: string
    userId?: string
    organizationId?: string
  } = {}
): { ctx: HttpContext; response: FakeResponse } {
  const response: FakeResponse = {
    body: undefined,
    statusCode: 200,
    headers: new Map(),
    getBody() {
      return this.body
    },
    getStatus() {
      return this.statusCode
    },
    getHeader(name: string) {
      return this.headers.get(name.toLowerCase())
    },
    header(name: string, value: unknown) {
      this.headers.set(name.toLowerCase(), value)
    },
    send(body: unknown) {
      this.body = body
    },
    status(statusCode: number) {
      this.statusCode = statusCode
      return this
    },
  }

  const headers: Record<string, string> = {
    'accept': 'application/json',
    'accept-language': options.language ?? 'vi',
  }
  const ctx = {
    auth: { user: { id: options.userId ?? 'user-1' } },
    currentOrganizationId: options.organizationId ?? 'org-1',
    request: {
      method: () => 'GET',
      url: () => options.url ?? '/tasks?page=1',
      header: (name: string) => headers[name.toLowerCase()],
    },
    response,
    session: {
      get: () => null,
    },
  } as unknown as HttpContext

  return { ctx, response }
}

function normalizedBody(body: unknown): unknown {
  return typeof body === 'string' ? (JSON.parse(body) as unknown) : body
}

test.group('CacheMiddleware', (group) => {
  group.each.setup(async () => {
    singleFlight.clear()
    await RedisCacheStore.flush()
  })

  test('coalesces concurrent misses and replays the leader response to followers', async ({
    assert,
  }) => {
    const middleware = new CacheMiddleware()
    const first = createContext()
    const second = createContext()
    let executions = 0

    const createNext = (response: FakeResponse): NextFn =>
      (async () => {
        executions++
        await new Promise((resolve) => setTimeout(resolve, 20))
        response.header('content-type', 'application/json; charset=utf-8')
        response.send({ source: 'handler' })
      }) as NextFn

    await Promise.all([
      middleware.handle(first.ctx, createNext(first.response), { ttl: 60 }),
      middleware.handle(second.ctx, createNext(second.response), { ttl: 60 }),
    ])

    assert.equal(executions, 1)
    assert.deepEqual(normalizedBody(first.response.body), { source: 'handler' })
    assert.deepEqual(normalizedBody(second.response.body), { source: 'handler' })
    assert.sameMembers(
      [first.response.headers.get('x-cache'), second.response.headers.get('x-cache')],
      ['MISS', 'HIT']
    )

    const cached = createContext()
    await middleware.handle(
      cached.ctx,
      (() => {
        throw new Error('Cache hit must not execute the downstream handler')
      }) as NextFn,
      { ttl: 60 }
    )
    assert.equal(cached.response.headers.get('x-cache'), 'HIT')
    assert.deepEqual(normalizedBody(cached.response.body), { source: 'handler' })
  })

  test('varies cache entries by locale and complete query string', async ({ assert }) => {
    const middleware = new CacheMiddleware()
    let executions = 0

    for (const context of [
      createContext({ url: '/tasks?page=1', language: 'vi' }),
      createContext({ url: '/tasks?page=2', language: 'vi' }),
      createContext({ url: '/tasks?page=1', language: 'en' }),
    ]) {
      await middleware.handle(
        context.ctx,
        (() => {
          executions++
          context.response.header('content-type', 'application/json')
          context.response.send({ executions })
          return Promise.resolve()
        }) as NextFn,
        { ttl: 60 }
      )
    }

    assert.equal(executions, 3)
  })

  test('does not cache private or cookie-setting responses', async ({ assert }) => {
    const middleware = new CacheMiddleware()
    let executions = 0

    for (let index = 0; index < 2; index++) {
      const context = createContext()
      await middleware.handle(
        context.ctx,
        (() => {
          executions++
          context.response.header('content-type', 'application/json')
          context.response.header('cache-control', 'private, no-store')
          context.response.header('set-cookie', 'session=secret')
          context.response.send({ executions })
          return Promise.resolve()
        }) as NextFn,
        { ttl: 60 }
      )
    }

    assert.equal(executions, 2)
  })
})
