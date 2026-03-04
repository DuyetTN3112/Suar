import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { createErrorEvent } from '#modules/errors/infra/repositories/error_event_repository'
import { PostgresErrorEventRetentionRepository } from '#modules/errors/infra/repositories/postgres_error_event_retention_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Error-event retention', (group) => {
  const codes: string[] = []

  group.setup(async () => {
    await setupApp()
  })

  group.each.teardown(async () => {
    if (codes.length > 0) {
      await db.from('error_events').whereIn('code', codes.splice(0)).delete()
    }
  })

  group.teardown(async () => {
    await teardownApp()
  })

  test('purges only due rows in deterministic bounded batches', async ({ assert }) => {
    const code = `RETENTION_${randomUUID()}`
    codes.push(code)
    const old = new Date('2026-01-01T00:00:00.000Z')
    const recent = new Date('2026-07-25T00:00:00.000Z')
    await db.table('error_events').insert([
      { id: randomUUID(), code, status: 500, severity: 'error', message: 'old-1', created_at: old },
      { id: randomUUID(), code, status: 500, severity: 'error', message: 'old-2', created_at: old },
      { id: randomUUID(), code, status: 500, severity: 'error', message: 'old-3', created_at: old },
      {
        id: randomUUID(),
        code,
        status: 500,
        severity: 'error',
        message: 'recent',
        created_at: recent,
      },
    ])
    const repository = new PostgresErrorEventRetentionRepository()
    const cutoff = new Date('2026-07-01T00:00:00.000Z')

    assert.equal(await repository.countDue(cutoff, 2), 2)
    assert.equal(await repository.purgeDue(cutoff, 2), 2)
    assert.equal(await repository.purgeDue(cutoff, 2), 1)
    assert.equal(await repository.purgeDue(cutoff, 2), 0)
    const remaining = (await db
      .from('error_events')
      .where('code', code)
      .select('message')) as Array<{ message: string }>
    assert.deepEqual(remaining.map((row) => row.message), ['recent'])
  })

  test('re-applies redaction and payload bounds at the persistence boundary', async ({
    assert,
  }) => {
    const code = `BOUNDS_${randomUUID()}`
    codes.push(code)
    const details = Object.fromEntries(
      Array.from({ length: 50 }, (_, index) => [`field_${String(index)}`, 'x'.repeat(3_000)])
    )
    await createErrorEvent({
      code,
      status: 500,
      severity: 'error',
      message: `private.user@example.com token=raw-secret ${'m'.repeat(3_000)}`,
      safe_message: 'safe'.repeat(500),
      details,
      request_id: null,
      correlation_id: 'c'.repeat(500),
      actor_user_id: null,
      actor_org_id: null,
      method: 'METHOD-THAT-IS-TOO-LONG',
      url: '/failure?access_token=raw-secret',
      ip_address: '1'.repeat(100),
      user_agent: 'u'.repeat(1_000),
    })

    const row = (await db.from('error_events').where('code', code).first()) as Record<
      string,
      unknown
    >
    assert.notInclude(String(row['message']), 'private.user@example.com')
    assert.notInclude(String(row['message']), 'raw-secret')
    assert.isAtMost(String(row['message']).length, 2_048)
    assert.isAtMost(String(row['safe_message']).length, 1_024)
    assert.isAtMost(String(row['correlation_id']).length, 128)
    assert.isAtMost(String(row['method']).length, 16)
    assert.equal(row['url'], '/failure')
    assert.isAtMost(String(row['ip_address']).length, 64)
    assert.isAtMost(String(row['user_agent']).length, 512)
    assert.deepEqual(row['details'], {
      diagnostic: '[TRUNCATED_OVERSIZED_DETAILS]',
    })
  })
})
