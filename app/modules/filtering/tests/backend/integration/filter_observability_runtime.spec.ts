import { test } from '@japa/runner'

import { ADMIN_AUDIT_FILTER_CONTEXT } from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_filter_context_provider'
import {
  configureApplicationLogger,
  type LoggerSink,
} from '#modules/logger/public_contracts/application_logger'
import { cleanupTestData } from '#tests/helpers/factories'
import { UserFactory } from '#tests/helpers/factories/user_org'

interface LogRecord {
  readonly level: string
  readonly message: string
  readonly args: readonly unknown[]
}

class MemoryLoggerSink implements LoggerSink {
  readonly records: LogRecord[] = []

  error(message: string, ...args: unknown[]): void {
    this.records.push({ level: 'error', message, args })
  }

  warn(message: string, ...args: unknown[]): void {
    this.records.push({ level: 'warn', message, args })
  }

  info(message: string, ...args: unknown[]): void {
    this.records.push({ level: 'info', message, args })
  }

  debug(message: string, ...args: unknown[]): void {
    this.records.push({ level: 'debug', message, args })
  }

  trace(message: string, ...args: unknown[]): void {
    this.records.push({ level: 'trace', message, args })
  }
}

test.group('Integration | Filter observability runtime', (group) => {
  let loggerSink: MemoryLoggerSink

  group.each.setup(() => {
    loggerSink = new MemoryLoggerSink()
    configureApplicationLogger({ logLevel: 'info', sink: loggerSink })
  })

  group.each.teardown(async () => {
    configureApplicationLogger({
      logLevel: 'silent',
      sink: {
        error: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {},
        trace: () => {},
      },
    })
    await cleanupTestData()
  })

  test('captures a real PostgreSQL filter success as a redacted structured event', async ({
    client,
    assert,
  }) => {
    const systemAdmin = await UserFactory.createSuperadmin()
    const secret = `runtime-secret-${Date.now()}`

    const response = await client
      .post('/api/v1/filter/query')
      .loginAs(systemAdmin)
      .json({
        criteria: {
          context: ADMIN_AUDIT_FILTER_CONTEXT,
          schemaVersion: 1,
          sort: [],
          page: { size: 5 },
          filter: {
            kind: 'condition',
            field: 'audit.resourceType',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: secret },
          },
        },
      })

    response.assertStatus(200)
    assert.lengthOf(loggerSink.records, 1)
    assert.equal(loggerSink.records[0]?.level, 'info')
    assert.equal(loggerSink.records[0]?.message, 'filter.query.completed')

    const serialized = JSON.stringify(loggerSink.records[0])
    assert.notInclude(serialized, secret)
    const payload = loggerSink.records[0]?.args[0] as Record<string, unknown>
    assert.equal(payload['schema_version'], 'filter-observability.v1')
    assert.match(String(payload['criteria_hash']), /^sha256:[0-9a-f]{64}$/u)
    assert.notProperty(payload, 'criteria')
    assert.notProperty(payload, 'provider_dsl')
    assert.notProperty(payload, 'result_body')
  })

  test('captures a real HTTP failure with redacted diagnostics', async ({ client, assert }) => {
    const systemAdmin = await UserFactory.createSuperadmin()
    const secret = `failure-secret-${Date.now()}`

    const response = await client
      .post('/api/v1/filter/query')
      .loginAs(systemAdmin)
      .json({
        criteria: {
          context: ADMIN_AUDIT_FILTER_CONTEXT,
          schemaVersion: 1,
          sort: [],
          page: { size: 5 },
          filter: {
            kind: 'condition',
            field: 'audit.secretInternalNote',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: secret },
          },
        },
      })

    response.assertStatus(400)
    assert.lengthOf(loggerSink.records, 1)
    assert.equal(loggerSink.records[0]?.level, 'error')
    assert.equal(loggerSink.records[0]?.message, 'filter.query.failed')
    assert.notInclude(JSON.stringify(loggerSink.records[0]), secret)

    const payload = loggerSink.records[0]?.args[0] as Record<string, unknown>
    assert.equal(payload['schema_version'], 'filter-observability.v1')
    assert.deepEqual(payload['error'], {
      code: 'FILTER_DIAGNOSTIC_REDACTED',
      cause_count: '0',
    })
    assert.notProperty(payload, 'criteria')
    assert.notProperty(payload, 'provider_dsl')
  })
})
