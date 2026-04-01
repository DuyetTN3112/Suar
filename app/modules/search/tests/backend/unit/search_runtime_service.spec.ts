import { test } from '@japa/runner'

import { SearchRuntimeService } from '#modules/search/actions/services/search_runtime_service'

test.group('Unit | Search Runtime Service', () => {
  test('logs structured ping failure events before rethrowing', async ({ assert }) => {
    const calls: string[] = []
    const service = new SearchRuntimeService(
      {
        ping: () => {
          throw new Error('ping down')
        },
      },
      () => true,
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
    assert.include(calls, 'ping down')
  })
})
