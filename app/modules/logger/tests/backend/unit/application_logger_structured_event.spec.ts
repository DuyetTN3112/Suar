import logger from '@adonisjs/core/services/logger'
import { test } from '@japa/runner'

import { AdonisLoggerSink } from '#modules/logger/infra/adapters/logger-runtime/adonis_logger_sink'
import {
  SanitizingLogger,
  type LoggerSink,
} from '#modules/logger/public_contracts/application_logger'

test.group('Unit | Application Logger Structured Event', () => {
  test('logStructured emits event name and payload', ({ assert }) => {
    const calls: Array<{ message: string; payload: Record<string, unknown> }> = []
    const service = new SanitizingLogger({
      logLevel: 'info',
      sink: createLoggerSink({
        info: (message, payload) =>
          calls.push({ message, payload: payload as Record<string, unknown> }),
      }),
    })

    service.logStructured('info', 'search.query.started', {
      module: 'search',
      workflow: 'global_search',
    })

    assert.lengthOf(calls, 1)
    assert.equal(calls[0]?.message, 'search.query.started')
    assert.deepEqual(calls[0]?.payload, {
      module: 'search',
      workflow: 'global_search',
    })
  })

  test('default sink forwards one structured record through the configured logger', ({
    assert,
  }) => {
    const calls: Array<{
      level: string
      fields: Record<string, unknown>
      message: string
    }> = []
    const originalLog = logger.log.bind(logger)
    logger.log = ((level: string, fields: Record<string, unknown>, message: string) => {
      calls.push({ level, fields, message })
    }) as typeof logger.log

    try {
      const service = new SanitizingLogger({
        logLevel: 'info',
        sink: new AdonisLoggerSink(),
      })
      service.logStructured('info', 'notifications.feed.loaded', {
        module: 'notifications',
        outcome: 'success',
      })
    } finally {
      logger.log = originalLog
    }

    assert.deepEqual(calls, [
      {
        level: 'info',
        fields: {
          module: 'notifications',
          outcome: 'success',
        },
        message: 'notifications.feed.loaded',
      },
    ])
  })

  test('sanitizes structured secrets, error diagnostics, and forged log lines', ({ assert }) => {
    const calls: Array<{ message: string; payload: Record<string, unknown> }> = []
    const service = new SanitizingLogger({
      logLevel: 'error',
      sink: createLoggerSink({
        error: (message, payload) =>
          calls.push({ message, payload: payload as Record<string, unknown> }),
      }),
    })

    service.error('dependency failed\r\nforged=success token=message-secret', {
      accessToken: 'payload-secret',
      connection: 'postgres://runtime-user:database-secret@db.internal/suar',
      failure: new Error('password=error-secret'),
      occurredAt: new Date('2026-07-24T00:00:00.000Z'),
    })

    assert.lengthOf(calls, 1)
    assert.equal(calls[0]?.message, 'dependency failed  forged=success token=[REDACTED]')
    assert.equal(calls[0]?.payload['accessToken'], '[REDACTED]')
    assert.equal(
      calls[0]?.payload['connection'],
      'postgres://[REDACTED]:[REDACTED]@db.internal/suar'
    )
    assert.deepInclude(calls[0]?.payload['failure'], {
      name: 'Error',
      message: 'password=[REDACTED]',
    })
    assert.isString((calls[0]?.payload['failure'] as Record<string, unknown>)['stack'])
    assert.equal(calls[0]?.payload['occurredAt'], '2026-07-24T00:00:00.000Z')
    assert.notInclude(JSON.stringify(calls), 'payload-secret')
    assert.notInclude(JSON.stringify(calls), 'database-secret')
    assert.notInclude(JSON.stringify(calls), 'error-secret')
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
