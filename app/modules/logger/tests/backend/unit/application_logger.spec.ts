import { test } from '@japa/runner'

import {
  SanitizingLogger,
  type LoggerSink,
} from '#modules/logger/public_contracts/application_logger'

test.group('Application logger', () => {
  test('logObject summarizes arrays and records without throwing', ({ assert }) => {
    const calls: string[] = []
    const service = new SanitizingLogger({
      logLevel: 'info',
      sink: createLoggerSink({ info: (message) => calls.push(message) }),
    })

    service.logObject('members', [{ id: 'u-1' }, { id: 'u-2' }], 'info')
    service.logObject('project', { id: 'p-1', title: 'Project Alpha' }, 'info')

    assert.lengthOf(calls, 2)
    assert.include(calls[0] ?? '', 'members: Mảng [2 phần tử], ID: u-1, u-2')
    assert.include(calls[1] ?? '', '"id":"p-1"')
    assert.include(calls[1] ?? '', '"name":"Project Alpha"')
  })

  test('uses the configured threshold consistently', ({ assert }) => {
    const calls: string[] = []
    const record = (message: string) => calls.push(message)
    const service = new SanitizingLogger({
      logLevel: 'warn',
      sink: createLoggerSink({
        error: record,
        warn: record,
        info: record,
        debug: record,
        trace: record,
      }),
    })

    service.error('failed')
    service.warn('degraded')
    service.info('started')
    service.debug('details')
    service.trace('trace')

    assert.deepEqual(calls, ['failed', 'degraded'])
  })

  test('silent suppresses all operational output', ({ assert }) => {
    const calls: string[] = []
    const record = (message: string) => calls.push(message)
    const service = new SanitizingLogger({
      logLevel: 'silent',
      sink: createLoggerSink({
        error: record,
        warn: record,
        info: record,
        debug: record,
        trace: record,
      }),
    })

    service.error('failed')
    service.warn('degraded')

    assert.isEmpty(calls)
  })

  test('sink failures never escape into business execution', ({ assert }) => {
    const service = new SanitizingLogger({
      logLevel: 'warn',
      sink: createLoggerSink({
        error: () => {
          throw new Error('logger transport unavailable')
        },
        warn: () => {
          throw new Error('logger transport unavailable')
        },
      }),
    })

    assert.doesNotThrow(() => service.error('dependency failed'))
    assert.doesNotThrow(() => service.warn('anomaly detected'))
  })
})

function createLoggerSink(overrides: Partial<LoggerSink>): LoggerSink {
  const ignore = () => {}
  return {
    error: ignore,
    warn: ignore,
    info: ignore,
    debug: ignore,
    trace: ignore,
    ...overrides,
  }
}
