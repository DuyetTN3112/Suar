import { test } from '@japa/runner'

import {
  classifyHttpTransport,
  isApiTransport,
  isCanonicalApiTransport,
} from '#modules/http/boundary/http_transport'

function makeRequest(input: {
  url: string
  inertia?: string | null
  accept?: 'json' | 'html'
}) {
  return {
    url: () => input.url,
    header: (name: string) => {
      if (name === 'X-Inertia') return input.inertia ?? null
      return null
    },
    accepts: () => input.accept ?? 'html',
  }
}

test.group('Http transport classification', () => {
  test('prefers explicit bound transport over URL sniffing', ({ assert }) => {
    const ctx = {
      httpTransportKind: 'api-admin-internal',
      request: makeRequest({
        url: '/api/v1/me',
        accept: 'json',
      }),
    }

    const transport = classifyHttpTransport(ctx as never)

    assert.equal(transport, 'api-admin-internal')
    assert.isTrue(isApiTransport(transport))
    assert.isFalse(isCanonicalApiTransport(transport))
  })

  test('classifies Inertia requests as page transport', ({ assert }) => {
    const request = makeRequest({
      url: '/tasks/abc',
      inertia: 'true',
      accept: 'html',
    })

    const transport = classifyHttpTransport(request as never)

    assert.equal(transport, 'page')
    assert.isFalse(isApiTransport(transport))
    assert.isFalse(isCanonicalApiTransport(transport))
  })

  test('classifies explicit canonical transport bindings as canonical API transport', ({
    assert,
  }) => {
    const ctx = {
      httpTransportKind: 'api-canonical',
      request: makeRequest({
        url: '/api/v1/me',
        accept: 'json',
      }),
    }

    const transport = classifyHttpTransport(ctx as never)

    assert.equal(transport, 'api-canonical')
    assert.isTrue(isApiTransport(transport))
    assert.isTrue(isCanonicalApiTransport(transport))
  })

  test('classifies explicit admin transport bindings as internal admin API transport', ({
    assert,
  }) => {
    const ctx = {
      httpTransportKind: 'api-admin-internal',
      request: makeRequest({
        url: '/api/admin/users',
        accept: 'json',
      }),
    }

    const transport = classifyHttpTransport(ctx as never)

    assert.equal(transport, 'api-admin-internal')
    assert.isTrue(isApiTransport(transport))
    assert.isFalse(isCanonicalApiTransport(transport))
  })

  test('classifies explicit public callback bindings as public callback transport', ({
    assert,
  }) => {
    const ctx = {
      httpTransportKind: 'api-public-callback',
      request: makeRequest({
        url: '/api/public/ai-disputes/callback',
        accept: 'json',
      }),
    }

    const transport = classifyHttpTransport(ctx as never)

    assert.equal(transport, 'api-public-callback')
    assert.isTrue(isApiTransport(transport))
    assert.isFalse(isCanonicalApiTransport(transport))
  })

  test('classifies explicit ops bindings as internal ops transport', ({ assert }) => {
    const ctx = {
      httpTransportKind: 'api-ops-internal',
      request: makeRequest({
        url: '/api/telemetry/ui-events',
        accept: 'json',
      }),
    }

    const transport = classifyHttpTransport(ctx as never)

    assert.equal(transport, 'api-ops-internal')
    assert.isTrue(isApiTransport(transport))
    assert.isFalse(isCanonicalApiTransport(transport))
  })

  test('treats unbound /api/v1 JSON requests as compatibility fallback until route binding applies', ({
    assert,
  }) => {
    const request = makeRequest({
      url: '/api/v1/me',
      accept: 'json',
    })

    const transport = classifyHttpTransport(request as never)

    assert.equal(transport, 'api-compat')
    assert.isTrue(isApiTransport(transport))
    assert.isFalse(isCanonicalApiTransport(transport))
  })

  test('classifies legacy /api requests as compatibility API transport when unbound', ({
    assert,
  }) => {
    const request = makeRequest({
      url: '/api/tasks/123',
      accept: 'json',
    })

    const transport = classifyHttpTransport(request as never)

    assert.equal(transport, 'api-compat')
    assert.isTrue(isApiTransport(transport))
    assert.isFalse(isCanonicalApiTransport(transport))
  })

  test('falls back to page transport for non-api HTML requests', ({ assert }) => {
    const request = makeRequest({
      url: '/settings',
      accept: 'html',
    })

    const transport = classifyHttpTransport(request as never)

    assert.equal(transport, 'page')
  })

  test('falls back to compatibility API transport for non-prefixed JSON requests', ({
    assert,
  }) => {
    const request = makeRequest({
      url: '/search',
      accept: 'json',
    })

    const transport = classifyHttpTransport(request as never)

    assert.equal(transport, 'api-compat')
  })
})
