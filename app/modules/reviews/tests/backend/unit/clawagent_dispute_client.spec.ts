import { test } from '@japa/runner'

import { ClawagentDisputeClient } from '#modules/reviews/infra/adapters/clawagent_dispute_client'

test.group('ClawagentDisputeClient', () => {
  test('defaults to the documented 18080 port when the env is unset', async ({ assert }) => {
    const capturedRequests: Array<{ url: string }> = []
    const client = ClawagentDisputeClient.fromEnvironment({}, (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      capturedRequests.push({ url })
      return Promise.resolve(new Response(JSON.stringify({ evaluation_id: 'noop' }), { status: 202 }))
    })

    await client.trigger('evaluation-default-port', {})

    assert.equal(capturedRequests[0]?.url, 'http://localhost:18080/api/public/disputes/arbitrate')
  })

  test('uses a stable idempotency key and accepts the external run id', async ({ assert }) => {
    const capturedRequests: Array<{ url: string; init?: RequestInit }> = []
    const client = new ClawagentDisputeClient({
      url: 'https://clawagent.example/disputes',
      apiKey: 'integration-secret',
      timeoutMs: 1_000,
      fetchImpl: (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        capturedRequests.push({ url, ...(init ? { init } : {}) })
        return Promise.resolve(
          new Response(JSON.stringify({ evaluation_id: 'external-run-1' }), {
            status: 202,
          })
        )
      },
    })

    const result = await client.trigger('evaluation-1', { disputeId: 'evaluation-1' })

    assert.deepEqual(result, { ok: true, externalRunId: 'external-run-1' })
    const capturedRequest = capturedRequests[0]
    assert.exists(capturedRequest)
    if (!capturedRequest) return
    assert.equal(capturedRequest.url, 'https://clawagent.example/disputes')
    assert.equal(
      (capturedRequest.init?.headers as Record<string, string>)['Idempotency-Key'],
      'evaluation-1'
    )
    assert.equal(
      (capturedRequest.init?.headers as Record<string, string>)['X-API-Key'],
      'integration-secret'
    )
  })

  test('aborts a request that exceeds the total deadline', async ({ assert }) => {
    const client = new ClawagentDisputeClient({
      url: 'https://clawagent.example/disputes',
      timeoutMs: 5,
      fetchImpl: (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true }
          )
        }),
    })

    const result = await client.trigger('evaluation-timeout', {})

    assert.deepEqual(result, {
      ok: false,
      code: 'CLAWAGENT_TIMEOUT',
      retryable: true,
      diagnostic: 'Clawagent request deadline exceeded',
      httpStatus: null,
    })
  })

  test('propagates caller shutdown abort instead of classifying it as retryable failure', async ({
    assert,
  }) => {
    const controller = new AbortController()
    const client = new ClawagentDisputeClient({
      url: 'https://clawagent.example/disputes',
      timeoutMs: 1_000,
      fetchImpl: (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('worker shutdown', 'AbortError')),
            { once: true }
          )
        }),
    })

    const pending = client.trigger('evaluation-shutdown', {}, controller.signal)
    controller.abort(new DOMException('worker shutdown', 'AbortError'))

    await assert.rejects(() => pending, /worker shutdown/)
  })

  test('bounds and redacts dependency diagnostics', async ({ assert }) => {
    const secret = 'integration-secret'
    const client = new ClawagentDisputeClient({
      url: 'https://clawagent.example/disputes?token=do-not-log',
      apiKey: secret,
      timeoutMs: 1_000,
      maxDiagnosticBytes: 128,
      fetchImpl: () =>
        Promise.resolve(
          new Response(
            `token=${secret} Bearer abc.def.ghi ${'diagnostic-data '.repeat(30)}`,
            { status: 503 }
          )
        ),
    })

    const result = await client.trigger('evaluation-2', {})

    assert.isFalse(result.ok)
    if (result.ok) return
    assert.equal(result.code, 'CLAWAGENT_HTTP_ERROR')
    assert.isTrue(result.retryable)
    assert.notInclude(result.diagnostic, secret)
    assert.isAtMost(Buffer.byteLength(result.diagnostic, 'utf8'), 128)
  })

  test('does not classify a permanent 4xx response as retryable', async ({ assert }) => {
    const client = new ClawagentDisputeClient({
      url: 'https://clawagent.example/disputes',
      timeoutMs: 1_000,
      fetchImpl: () => Promise.resolve(new Response('invalid payload', { status: 400 })),
    })

    const result = await client.trigger('evaluation-3', {})

    assert.isFalse(result.ok)
    if (result.ok) return
    assert.equal(result.httpStatus, 400)
    assert.isFalse(result.retryable)
  })
})
