import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'

function toHttpContext(
  value: unknown
): HttpContext {
  return value as HttpContext
}

interface ResponseState {
  statusCode: number
  headers: Record<string, string>
  payload: unknown
}

test.group('HTTP API error emitter', () => {
  test('emits Problem Details for canonical API transport', ({ assert }) => {
    const responseState: ResponseState = {
      statusCode: 200,
      headers: {},
      payload: null,
    }

    const ctx = {
      requestContext: {
        requestId: 'req_1',
        correlationId: 'corr_1',
      },
      response: {
        status(code: number) {
          responseState.statusCode = code
          return this
        },
        header(name: string, value: string) {
          responseState.headers[name.toLowerCase()] = value
          return this
        },
        json(payload: unknown) {
          responseState.payload = payload
          return this
        },
      },
    }

    emitApiError(toHttpContext(ctx), {
      transport: 'api-canonical',
      status: 403,
      code: 'E_FORBIDDEN',
      detail: 'Forbidden',
    })

    assert.equal(responseState.statusCode, 403)
    assert.equal(
      responseState.headers['content-type'],
      'application/problem+json'
    )
    assert.deepEqual(responseState.payload, {
      type: 'https://docs.suar.dev/problems/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: 'Forbidden',
      code: 'E_FORBIDDEN',
      requestId: 'req_1',
      correlationId: 'corr_1',
    })
  })

  test('emits legacy compat envelope for compatibility API transport', ({
    assert,
  }) => {
    const responseState: ResponseState = {
      statusCode: 200,
      headers: {},
      payload: null,
    }

    const ctx = {
      requestContext: {
        requestId: 'req_2',
        correlationId: 'corr_2',
      },
      response: {
        status(code: number) {
          responseState.statusCode = code
          return this
        },
        header(name: string, value: string) {
          responseState.headers[name.toLowerCase()] = value
          return this
        },
        json(payload: unknown) {
          responseState.payload = payload
          return this
        },
      },
    }

    emitApiError(toHttpContext(ctx), {
      transport: 'api-compat',
      status: 422,
      code: 'E_VALIDATION',
      detail: 'Invalid input',
      errors: {
        email: 'Required',
      },
      redirectTo: '/organizations',
    })

    assert.equal(responseState.statusCode, 422)
    assert.deepEqual(responseState.headers, {})
    assert.deepEqual(responseState.payload, {
      success: false,
      error: {
        code: 'E_VALIDATION',
        message: 'Invalid input',
        errors: {
          email: 'Required',
        },
      },
      meta: {
        request_id: 'req_2',
        correlation_id: 'corr_2',
      },
      redirectTo: '/organizations',
    })
  })

  test('emits legacy compat envelope with trace meta when requested', ({ assert }) => {
    const responseState: ResponseState = {
      statusCode: 200,
      headers: {},
      payload: null,
    }

    const ctx = {
      requestContext: {
        requestId: 'req_meta_1',
        correlationId: 'corr_meta_1',
      },
      response: {
        status(code: number) {
          responseState.statusCode = code
          return this
        },
        header(name: string, value: string) {
          responseState.headers[name.toLowerCase()] = value
          return this
        },
        json(payload: unknown) {
          responseState.payload = payload
          return this
        },
      },
    }

    emitApiError(toHttpContext(ctx), {
      transport: 'api-compat',
      status: 403,
      code: 'E_FORBIDDEN',
      detail: 'Forbidden',
      includeLegacyMeta: true,
    })

    assert.equal(responseState.statusCode, 403)
    assert.deepEqual(responseState.payload, {
      success: false,
      error: {
        code: 'E_FORBIDDEN',
        message: 'Forbidden',
      },
      meta: {
        request_id: 'req_meta_1',
        correlation_id: 'corr_meta_1',
      },
    })
  })
})
