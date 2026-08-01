import { test } from '@japa/runner'

import {
  ERROR_EVENT_RETENTION_COUNT_CAP,
  normalizeErrorEventRetentionReason,
  requireErrorEventRetentionBatchSize,
  requireErrorEventRetentionConfirmation,
  resolveErrorEventRetentionCutoff,
  summarizeErrorEventRetentionDueCount,
} from '#modules/errors/domain/error_event_retention_policy'

test.group('Error-event retention policy', () => {
  test('owns cutoff and bounded count rules', ({ assert }) => {
    const cutoff = resolveErrorEventRetentionCutoff(
      new Date('2026-07-26T12:00:00.000Z'),
      30
    )

    assert.equal(cutoff.toISOString(), '2026-06-26T12:00:00.000Z')
    assert.deepEqual(summarizeErrorEventRetentionDueCount(ERROR_EVENT_RETENTION_COUNT_CAP), {
      dueCount: ERROR_EVENT_RETENTION_COUNT_CAP - 1,
      countCapped: true,
    })
  })

  test('owns destructive retention input invariants', ({ assert }) => {
    assert.equal(
      normalizeErrorEventRetentionReason('  scheduled privacy retention  '),
      'scheduled privacy retention'
    )
    assert.doesNotThrow(() => requireErrorEventRetentionBatchSize(1_000))
    assert.doesNotThrow(() => requireErrorEventRetentionConfirmation('PURGE'))
    assert.throws(() => requireErrorEventRetentionBatchSize(1_001), /batchSize/)
    assert.throws(() => requireErrorEventRetentionConfirmation('DELETE'), /confirmation/)
  })
})
