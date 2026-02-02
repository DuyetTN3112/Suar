import type { AxiosInstance } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiProblemFromError } from '../http/api_problem.js'
import {
  captureRuntimeError,
  DEFAULT_AXIOS_TIMEOUT_MS,
  installAxiosErrorPolicy,
  installGlobalRuntimeErrorBoundary,
  RUNTIME_ERROR_EVENT,
} from '../http/axios_error_policy.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('installAxiosErrorPolicy', () => {
  it('installs once per client and preserves normalized metadata on non-Error rejections', async () => {
    let rejectResponse!: (error: unknown) => Promise<never>
    const use = vi.fn(
      (
        _onFulfilled: (response: unknown) => unknown,
        onRejected: (error: unknown) => Promise<never>
      ) => {
        rejectResponse = onRejected
        return 1
      }
    )
    const client = {
      defaults: {
        timeout: 0,
      },
      interceptors: {
        response: { use },
      },
    } as unknown as AxiosInstance

    installAxiosErrorPolicy(client)
    installAxiosErrorPolicy(client)

    expect(use).toHaveBeenCalledTimes(1)
    expect(client.defaults.timeout).toBe(DEFAULT_AXIOS_TIMEOUT_MS)
    const rejection = rejectResponse({
      response: {
        status: 409,
        data: {
          code: 'E_CONFLICT',
          detail: 'State changed',
        },
      },
    })
    await expect(rejection).rejects.toMatchObject({
      message: 'State changed',
    })

    try {
      await rejection
    } catch (error) {
      expect(apiProblemFromError(error)).toMatchObject({
        status: 409,
        code: 'E_CONFLICT',
        recovery: 'refresh_state',
      })
    }
  })
})

describe('runtime error telemetry', () => {
  it('publishes only bounded error metadata and never sends the raw diagnostic', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('telemetry unavailable'))
    vi.stubGlobal('fetch', fetchMock)
    let eventDetail: unknown
    window.addEventListener(
      RUNTIME_ERROR_EVENT,
      (event) => {
        eventDetail = (event as CustomEvent).detail
      },
      { once: true }
    )

    captureRuntimeError(new TypeError('secret-token=must-not-leak'), {
      surface: 'user',
      stage: 'bootstrap',
    })
    await Promise.resolve()

    expect(eventDetail).toEqual({
      type: 'TypeError',
      surface: 'user',
      stage: 'bootstrap',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(request.keepalive).toBe(true)
    const requestBody = request.body
    expect(typeof requestBody).toBe('string')
    if (typeof requestBody !== 'string') {
      throw new TypeError('Expected runtime telemetry body to be a string')
    }
    expect(requestBody).not.toContain('secret-token')
    expect(JSON.parse(requestBody)).toMatchObject({
      eventName: 'frontend.runtime.failed',
      metadata: {
        error_type: 'TypeError',
        stage: 'bootstrap',
      },
      surface: 'user',
    })
  })

  it('installs global error listeners once per surface and observes rejected promises', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    installGlobalRuntimeErrorBoundary('org')
    installGlobalRuntimeErrorBoundary('org')

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('runtime failure') }))
    const rejectionEvent = new Event('unhandledrejection')
    Object.defineProperty(rejectionEvent, 'reason', {
      value: new TypeError('rejected runtime work'),
    })
    window.dispatchEvent(rejectionEvent)
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
