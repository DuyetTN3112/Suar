import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import CacheAdminAccessMiddleware, {
  CACHE_ADMIN_BREAK_GLASS_HEADER,
  shouldExposeCacheValueDiagnostics,
  shouldRegisterCacheAdminRoutes,
} from '#modules/http/middleware/cache_admin_access_middleware'
import env from '#start/env'

const VALID_TOKEN = 'cache-admin-unit-break-glass-token-v1'

function toContext(value: unknown): HttpContext {
  return value as HttpContext
}

function installCacheAdminEnvironment(enabled: boolean, token: string | undefined): () => void {
  const originalGet = env.get.bind(env)
  Reflect.set(env, 'get', (key: string, defaultValue?: unknown) => {
    if (key === 'CACHE_ADMIN_API_ENABLED') return enabled
    if (key === 'CACHE_ADMIN_BREAK_GLASS_TOKEN') return token
    return originalGet(key as never, defaultValue as never)
  })
  return () => {
    Reflect.set(env, 'get', originalGet)
  }
}

function makeContext(options: {
  role?: string
  token?: string | undefined
  responseState?: { statusCode: number; payload: unknown }
}): HttpContext {
  return toContext({
    auth: {
      user: options.role ? { system_role: options.role } : null,
    },
    requestContext: {
      requestId: 'req_cache_admin_1',
      correlationId: 'corr_cache_admin_1',
    },
    request: {
      header(name: string) {
        return name === CACHE_ADMIN_BREAK_GLASS_HEADER ? options.token : undefined
      },
      accepts: () => 'json',
    },
    response: {
      status(code: number) {
        if (options.responseState) options.responseState.statusCode = code
        return this
      },
      json(payload: unknown) {
        if (options.responseState) options.responseState.payload = payload
        return this
      },
    },
  })
}

test.group('CacheAdminAccessMiddleware', () => {
  test('keeps value inspection and injection routes out of production', ({ assert }) => {
    assert.isTrue(shouldExposeCacheValueDiagnostics('development'))
    assert.isTrue(shouldExposeCacheValueDiagnostics('test'))
    assert.isFalse(shouldExposeCacheValueDiagnostics('production'))
    assert.isTrue(shouldRegisterCacheAdminRoutes('development', false))
    assert.isTrue(shouldRegisterCacheAdminRoutes('test', false))
    assert.isFalse(shouldRegisterCacheAdminRoutes('production', false))
    assert.isTrue(shouldRegisterCacheAdminRoutes('production', true))
  })

  test('hides the entire control plane while disabled', async ({ assert }) => {
    const restore = installCacheAdminEnvironment(false, VALID_TOKEN)
    try {
      await assert.rejects(
        () =>
          new CacheAdminAccessMiddleware().handle(
            makeContext({ role: 'superadmin', token: VALID_TOKEN }),
            () => Promise.resolve()
          ),
        /Không tìm thấy/i
      )
    } finally {
      restore()
    }
  })

  test('rejects broader admin roles even when they know the break-glass token', async ({
    assert,
  }) => {
    const restore = installCacheAdminEnvironment(true, VALID_TOKEN)
    try {
      await assert.rejects(
        () =>
          new CacheAdminAccessMiddleware().handle(
            makeContext({ role: 'system_admin', token: VALID_TOKEN }),
            () => Promise.resolve()
          ),
        /forbidden|permission|quyền/i
      )
    } finally {
      restore()
    }
  })

  test('fails unavailable when the separate credential is missing or weak', async ({ assert }) => {
    for (const token of [undefined, 'too-short']) {
      const restore = installCacheAdminEnvironment(true, token)
      const responseState = { statusCode: 200, payload: null as unknown }
      try {
        let nextCalled = false
        await new CacheAdminAccessMiddleware().handle(
          makeContext({ role: 'superadmin', token, responseState }),
          () => {
            nextCalled = true
            return Promise.resolve()
          }
        )
        assert.isFalse(nextCalled)
        assert.equal(responseState.statusCode, 503)
        if (token) {
          assert.notInclude(JSON.stringify(responseState.payload), token)
        }
      } finally {
        restore()
      }
    }
  })

  test('uses the independent credential and calls next only on an exact match', async ({
    assert,
  }) => {
    const restore = installCacheAdminEnvironment(true, VALID_TOKEN)
    try {
      await assert.rejects(
        () =>
          new CacheAdminAccessMiddleware().handle(
            makeContext({ role: 'superadmin', token: `${VALID_TOKEN}-wrong` }),
            () => Promise.resolve()
          ),
        /credential is invalid or missing/
      )

      let nextCalls = 0
      await new CacheAdminAccessMiddleware().handle(
        makeContext({ role: 'superadmin', token: VALID_TOKEN }),
        () => {
          nextCalls++
          return Promise.resolve()
        }
      )
      assert.equal(nextCalls, 1)
    } finally {
      restore()
    }
  })
})
