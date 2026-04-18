import { describe, expect, it } from 'vitest'

import { normalizeApiProblem } from '../http/api_problem.js'

describe('normalizeApiProblem', () => {
  it('normalizes canonical RFC Problem Details with recovery metadata', () => {
    const problem = normalizeApiProblem({
      config: {
        method: 'get',
      },
      response: {
        status: 429,
        headers: {
          'retry-after': '30',
        },
        data: {
          type: 'https://docs.suar.dev/problems/rate-limit',
          title: 'Rate limit exceeded',
          status: 429,
          detail: 'Try again later',
          code: 'E_RATE_LIMIT',
          category: 'rate_limit',
          retryable: true,
          requestId: 'req-1',
          correlationId: 'corr-1',
          errors: {
            query: 'Too many searches',
          },
        },
      },
    })

    expect(problem).toMatchObject({
      status: 429,
      code: 'E_RATE_LIMIT',
      category: 'rate_limit',
      requestId: 'req-1',
      correlationId: 'corr-1',
      retryAfterSeconds: 30,
      retryable: true,
      recovery: 'retry_after',
      fieldErrors: {
        query: 'Too many searches',
      },
    })
  })

  it('normalizes compatibility envelopes and canonical conflict codes', () => {
    const problem = normalizeApiProblem({
      response: {
        status: 409,
        data: {
          error: {
            code: 'E_CONFLICT',
            message: 'The task changed',
          },
          meta: {
            request_id: 'req-compat',
            correlation_id: 'corr-compat',
          },
        },
      },
    })

    expect(problem).toMatchObject({
      status: 409,
      code: 'E_CONFLICT',
      detail: 'The task changed',
      requestId: 'req-compat',
      correlationId: 'corr-compat',
      recovery: 'refresh_state',
    })
  })

  it('does not expose raw transport messages for server and network failures', () => {
    const serverProblem = normalizeApiProblem({
      message: 'password=secret',
      response: {
        status: 500,
        data: {
          detail: 'password=secret at db.internal:5432',
        },
      },
    })
    const networkProblem = normalizeApiProblem({
      message: 'connect ECONNREFUSED 10.0.0.5:5432',
    })

    expect(serverProblem.detail).toBe('Unable to complete the request. Please try again.')
    expect(serverProblem.detail).not.toContain('secret')
    expect(serverProblem.detail).not.toContain('db.internal')
    expect(networkProblem.code).toBe('E_NETWORK')
    expect(networkProblem.detail).not.toContain('10.0.0.5')
  })

  it('honors an explicit non-retryable dependency outcome from the server', () => {
    const problem = normalizeApiProblem({
      config: {
        method: 'get',
      },
      response: {
        status: 503,
        data: {
          code: 'E_DATABASE_OUTCOME_UNKNOWN',
          category: 'dependency',
          retryable: false,
          detail: 'internal diagnostic must be hidden',
        },
      },
    })

    expect(problem).toMatchObject({
      status: 503,
      code: 'E_DATABASE_OUTCOME_UNKNOWN',
      category: 'dependency',
      retryable: false,
      recovery: 'none',
    })
    expect(problem.detail).not.toContain('internal diagnostic')
  })

  it('does not trust retryable true for an unsafe mutation without idempotency', () => {
    const unsafeMutation = normalizeApiProblem({
      config: {
        method: 'post',
      },
      response: {
        status: 503,
        data: {
          code: 'E_DATABASE_UNAVAILABLE',
          category: 'dependency',
          retryable: true,
          detail: 'Service unavailable',
        },
      },
    })
    const idempotentMutation = normalizeApiProblem({
      config: {
        method: 'post',
        headers: {
          'idempotency-key': 'stable-operation-key',
        },
      },
      response: {
        status: 503,
        data: {
          code: 'E_DATABASE_UNAVAILABLE',
          category: 'dependency',
          retryable: true,
          detail: 'Service unavailable',
        },
      },
    })

    expect(unsafeMutation).toMatchObject({
      retryable: false,
      recovery: 'none',
    })
    expect(idempotentMutation).toMatchObject({
      retryable: true,
      recovery: 'retry',
    })
  })

  it('distinguishes client timeout and only recommends transport retry for safe requests', () => {
    const postTimeout = normalizeApiProblem({
      code: 'ECONNABORTED',
      message: 'timeout of 30000ms exceeded at private.internal',
      config: {
        method: 'post',
      },
    })
    const idempotentTimeout = normalizeApiProblem({
      code: 'ETIMEDOUT',
      config: {
        method: 'post',
        headers: {
          'Idempotency-Key': 'stable-key',
        },
      },
    })

    expect(postTimeout).toMatchObject({
      code: 'E_CLIENT_TIMEOUT',
      timedOut: true,
      networkError: true,
      retryable: false,
      recovery: 'none',
    })
    expect(postTimeout.detail).not.toContain('private.internal')
    expect(idempotentTimeout).toMatchObject({
      code: 'E_CLIENT_TIMEOUT',
      timedOut: true,
      retryable: true,
      recovery: 'retry',
    })
  })
})
