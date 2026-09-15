import { test } from '@japa/runner'

import type { DomainEventOutboxStatusSummary } from '#modules/events/public_contracts/domain_event_outbox_status'
import {
  DomainEventOutboxHealthCheck,
  type DomainEventOutboxHealthThresholds,
} from '#modules/http/health_checks/domain_event_outbox_health_check'

const NOW = new Date('2030-07-27T00:00:00.000Z')
const THRESHOLDS: DomainEventOutboxHealthThresholds = {
  warningDuePending: 10,
  failureDuePending: 100,
  warningDueAgeMs: 30_000,
  failureDueAgeMs: 300_000,
  failureExpiredLeaseAgeMs: 60_000,
}

function snapshot(
  overrides: Partial<DomainEventOutboxStatusSummary> = {}
): DomainEventOutboxStatusSummary {
  return {
    observedAt: NOW,
    countCap: 10_000,
    duePending: 0,
    duePendingCountCapped: false,
    futureBackoffPending: 0,
    futureBackoffPendingCountCapped: false,
    activeLeases: 0,
    activeLeaseCountCapped: false,
    expiredLeases: 0,
    expiredLeaseCountCapped: false,
    deadLetter: 0,
    deadLetterCountCapped: false,
    oldestDuePendingAgeMs: null,
    nextBackoffDueInMs: null,
    nextActiveLeaseExpiryInMs: null,
    oldestExpiredLeaseAgeMs: null,
    oldestDeadLetterAgeMs: null,
    ...overrides,
  }
}

function reader(value: DomainEventOutboxStatusSummary) {
  return {
    status: () => Promise.resolve(value),
  }
}

test.group('DomainEventOutboxHealthCheck', () => {
  test('keeps future backoff and active leases healthy', async ({ assert }) => {
    const result = await new DomainEventOutboxHealthCheck(
      reader(
        snapshot({
          futureBackoffPending: 42,
          activeLeases: 7,
          nextBackoffDueInMs: 90_000,
          nextActiveLeaseExpiryInMs: 15_000,
        })
      ),
      () => NOW,
      THRESHOLDS
    ).run()

    assert.equal(result.status, 'ok')
    assert.equal(result.meta?.['due_pending'], 0)
    assert.equal(result.meta?.['future_backoff_pending'], 42)
    assert.equal(result.meta?.['active_leases'], 7)
    assert.equal(result.meta?.['next_backoff_due_in_seconds'], 90)
    assert.notProperty(result.meta ?? {}, 'payload')
  })

  test('warns on a newly expired lease without treating active leases as lost', async ({
    assert,
  }) => {
    const result = await new DomainEventOutboxHealthCheck(
      reader(
        snapshot({
          activeLeases: 4,
          expiredLeases: 1,
          oldestExpiredLeaseAgeMs: 1_000,
        })
      ),
      () => NOW,
      THRESHOLDS
    ).run()

    assert.equal(result.status, 'warning')
    assert.equal(result.meta?.['active_leases'], 4)
    assert.equal(result.meta?.['expired_leases'], 1)
  })

  test('fails when an expired lease is stale or a dead letter exists', async ({ assert }) => {
    const staleLease = await new DomainEventOutboxHealthCheck(
      reader(snapshot({ expiredLeases: 1, oldestExpiredLeaseAgeMs: 60_000 })),
      () => NOW,
      THRESHOLDS
    ).run()
    const deadLetter = await new DomainEventOutboxHealthCheck(
      reader(snapshot({ deadLetter: 1, oldestDeadLetterAgeMs: 15_000 })),
      () => NOW,
      THRESHOLDS
    ).run()

    assert.equal(staleLease.status, 'error')
    assert.equal(deadLetter.status, 'error')
    assert.equal(deadLetter.meta?.['oldest_dead_letter_age_seconds'], 15)
  })

  test('uses only due backlog count and age for backlog degradation', async ({ assert }) => {
    const warning = await new DomainEventOutboxHealthCheck(
      reader(snapshot({ duePending: 1, oldestDuePendingAgeMs: 30_000 })),
      () => NOW,
      THRESHOLDS
    ).run()
    const failure = await new DomainEventOutboxHealthCheck(
      reader(snapshot({ duePending: 100, oldestDuePendingAgeMs: 1_000 })),
      () => NOW,
      THRESHOLDS
    ).run()

    assert.equal(warning.status, 'warning')
    assert.equal(failure.status, 'error')
  })

  test('fails closed without exposing database diagnostics', async ({ assert }) => {
    const result = await new DomainEventOutboxHealthCheck(
      {
        status: () => Promise.reject(new Error('secret database host and SQL payload')),
      },
      () => NOW,
      THRESHOLDS
    ).run()

    assert.equal(result.status, 'error')
    assert.notInclude(JSON.stringify(result), 'secret database host')
    assert.notInclude(JSON.stringify(result), 'payload')
  })

  test('rejects inconsistent thresholds', ({ assert }) => {
    assert.throws(
      () =>
        new DomainEventOutboxHealthCheck(reader(snapshot()), () => NOW, {
          ...THRESHOLDS,
          failureDuePending: THRESHOLDS.warningDuePending,
        }),
      /positive warning values below failure values/
    )
  })
})
