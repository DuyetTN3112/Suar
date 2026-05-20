import { test } from '@japa/runner'

import {
  DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP,
  requireDomainEventOutboxRetentionMutation,
  resolveDomainEventOutboxRetentionCutoffs,
  summarizeDomainEventOutboxRetentionCounts,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox_retention_policy'

test.group('Domain event outbox retention policy', () => {
  test('owns independent retention windows and bounded counts', ({ assert }) => {
    const cutoffs = resolveDomainEventOutboxRetentionCutoffs({
      now: new Date('2026-07-26T12:00:00.000Z'),
      processedRetentionDays: 30,
      replayHistoryRetentionDays: 365,
    })

    assert.equal(cutoffs.processedBefore.toISOString(), '2026-06-26T12:00:00.000Z')
    assert.equal(cutoffs.replayHistoryBefore.toISOString(), '2025-07-26T12:00:00.000Z')
    assert.deepEqual(
      summarizeDomainEventOutboxRetentionCounts({
        processedRows: DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP,
        replayHistoryRows: 7,
      }),
      {
        dueProcessedRows: DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP - 1,
        dueReplayHistoryRows: 7,
        processedCountCapped: true,
        replayHistoryCountCapped: false,
      }
    )
  })

  test('owns destructive retention confirmation and bounds', ({ assert }) => {
    assert.deepEqual(
      requireDomainEventOutboxRetentionMutation({
        batchSize: 500,
        reason: ' scheduled privacy retention ',
        confirmation: 'PURGE',
      }),
      { reason: 'scheduled privacy retention' }
    )
    assert.throws(
      () =>
        requireDomainEventOutboxRetentionMutation({
          batchSize: 1_001,
          reason: 'scheduled privacy retention',
          confirmation: 'PURGE',
        }),
      /batchSize/
    )
  })
})
