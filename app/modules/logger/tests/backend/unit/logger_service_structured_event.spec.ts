import logger from '@adonisjs/core/services/logger'
import { test } from '@japa/runner'

import { LoggerService } from '#modules/logger/infra/logger_service'

test.group('Unit | Logger Service Structured Event', () => {
  test('logStructured emits event name and payload', ({ assert }) => {
    const service = new LoggerService()
    const calls: Array<{ message: string; payload: Record<string, unknown> }> = []
    const originalInfo = logger.info.bind(logger)

    ;(service as unknown as { isDevMode: boolean; currentLogLevel: string }).isDevMode = true
    ;(service as unknown as { isDevMode: boolean; currentLogLevel: string }).currentLogLevel = 'info'
    logger.info = ((message: string, payload: Record<string, unknown>) => {
      calls.push({ message, payload })
    }) as typeof logger.info

    try {
      service.logStructured('info', 'search.query.started', {
        module: 'search',
        workflow: 'global_search',
      })
    } finally {
      logger.info = originalInfo
    }

    assert.lengthOf(calls, 1)
    assert.equal(calls[0]?.message, '[INFO] search.query.started')
    assert.deepEqual(calls[0]?.payload, {
      module: 'search',
      workflow: 'global_search',
    })
  })
})
