import { test } from '@japa/runner'

import { SearchRuntimeAdapter } from '#modules/search/infra/adapters/search_runtime_adapter'

test.group('Unit | Search Runtime Adapter', () => {
  test('logs structured ping failure events before rethrowing', async ({ assert }) => {
    const calls: string[] = []
    const service = new SearchRuntimeAdapter(
      {
        ping: () => {
          throw new Error('ping down token=runtime-secret')
        },
      },
      {
        isEnabled: () => true,
      },
      {
        log: (_level, event) => {
          calls.push(typeof event.event_name === 'string' ? event.event_name : JSON.stringify(event.event_name))
          const errorMessage =
            event.error && typeof event.error === 'object' && 'message' in event.error
              ? String(event.error['message'])
              : ''
          calls.push(errorMessage)
        },
      }
    )

    await assert.rejects(async () => {
      await service.ping()
    })

    assert.include(calls, 'search.runtime.ping_failed')
    assert.include(calls, 'ping down token=[REDACTED]')
    assert.notInclude(JSON.stringify(calls), 'runtime-secret')
  })
})
