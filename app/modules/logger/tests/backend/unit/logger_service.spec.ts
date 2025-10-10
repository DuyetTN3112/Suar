import logger from '@adonisjs/core/services/logger'
import { test } from '@japa/runner'

import { LoggerService } from '#modules/logger/infra/logger_service'

test.group('Logger service', () => {
  test('logObject summarizes arrays and records without throwing', ({ assert }) => {
    const service = new LoggerService()
    const calls: string[] = []
    const originalInfo = logger.info.bind(logger)

    ;(service as unknown as { isDevMode: boolean; currentLogLevel: string }).isDevMode = true
    ;(service as unknown as { isDevMode: boolean; currentLogLevel: string }).currentLogLevel = 'info'
    logger.info = ((message: string) => {
      calls.push(message)
    }) as typeof logger.info

    try {
      service.logObject('members', [{ id: 'u-1' }, { id: 'u-2' }], 'info')
      service.logObject('project', { id: 'p-1', title: 'Project Alpha' }, 'info')
    } finally {
      logger.info = originalInfo
    }

    assert.lengthOf(calls, 2)
    assert.include(calls[0] ?? '', 'members: Mảng [2 phần tử], ID: u-1, u-2')
    assert.include(calls[1] ?? '', '"id":"p-1"')
    assert.include(calls[1] ?? '', '"name":"Project Alpha"')
  })
})
