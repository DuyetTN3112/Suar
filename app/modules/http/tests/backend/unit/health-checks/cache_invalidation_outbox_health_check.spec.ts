import { test } from '@japa/runner'

import { CacheInvalidationOutboxHealthCheck } from '#modules/http/health_checks/cache_invalidation_outbox_health_check'

const now = new Date('2026-07-23T00:10:00.000Z')

function reader(
  input: Partial<{
    configured: boolean
    pending: number
    leased: number
    deadLetter: number
    oldestOutstandingAt: Date | null
  }> = {}
) {
  return {
    backlog: () =>
      Promise.resolve({
        configured: input.configured ?? true,
        pending: input.pending ?? 0,
        leased: input.leased ?? 0,
        deadLetter: input.deadLetter ?? 0,
        oldestOutstandingAt: input.oldestOutstandingAt ?? null,
      }),
  }
}

test.group('CacheInvalidationOutboxHealthCheck', () => {
  test('is healthy when the durable queue is current', async ({ assert }) => {
    const result = await new CacheInvalidationOutboxHealthCheck(reader(), () => now).run()

    assert.equal(result.status, 'ok')
    assert.equal(result.meta?.['pending'], 0)
    assert.equal(result.meta?.['dead_letter'], 0)
  })

  test('warns when the oldest intent exceeds the warning objective', async ({ assert }) => {
    const result = await new CacheInvalidationOutboxHealthCheck(
      reader({
        pending: 1,
        oldestOutstandingAt: new Date(now.getTime() - 31_000),
      }),
      () => now
    ).run()

    assert.equal(result.status, 'warning')
    assert.equal(result.meta?.['oldest_outstanding_age_seconds'], 31)
  })

  test('fails readiness when a dead letter exists', async ({ assert }) => {
    const result = await new CacheInvalidationOutboxHealthCheck(
      reader({ deadLetter: 1 }),
      () => now
    ).run()

    assert.equal(result.status, 'error')
    assert.equal(result.meta?.['dead_letter'], 1)
  })

  test('fails readiness when outstanding invalidation age exceeds the failure threshold', async ({
    assert,
  }) => {
    const result = await new CacheInvalidationOutboxHealthCheck(
      reader({
        pending: 1,
        oldestOutstandingAt: new Date(now.getTime() - 301_000),
      }),
      () => now
    ).run()

    assert.equal(result.status, 'error')
    assert.equal(result.meta?.['oldest_outstanding_age_seconds'], 301)
  })

  test('fails closed when the outbox schema is missing', async ({ assert }) => {
    const result = await new CacheInvalidationOutboxHealthCheck(
      reader({ configured: false }),
      () => now
    ).run()

    assert.equal(result.status, 'error')
    assert.isFalse(result.meta?.['configured'] as boolean)
  })
})
