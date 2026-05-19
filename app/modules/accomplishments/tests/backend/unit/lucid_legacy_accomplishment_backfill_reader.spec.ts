import { test } from '@japa/runner'

import { mapLegacyWorkHistoryRow } from '#modules/accomplishments/infra/adapters/legacy-backfill/lucid_legacy_accomplishment_backfill_reader'

test.group('Unit | Lucid legacy accomplishment backfill reader', () => {
  test('maps compatibility rows conservatively without inventing governance facts', ({ assert }) => {
    const result = mapLegacyWorkHistoryRow({
      id: 'history-1',
      user_id: 'user-1',
      task_id: 'task-1',
      task_assignment_id: 'assignment-1',
      evidence_links: [{ kind: 'url' }],
    })

    assert.deepEqual(result, {
      sourceId: 'history-1',
      userId: 'user-1',
      taskAssignmentId: 'assignment-1',
      taskId: 'task-1',
      hasImmutableAssignmentSnapshot: false,
      hasCompletionReport: false,
      hasGovernedReviewConfirmation: false,
      hasVerifiedClaim: false,
      hasSufficientEvidence: false,
      userConfirmedRetrospective: false,
      sourceCorrupt: false,
    })
  })

  test('quarantines malformed identity or evidence shape', ({ assert }) => {
    assert.isTrue(
      mapLegacyWorkHistoryRow({
        id: '',
        user_id: 'user-1',
        task_id: 'task-1',
        task_assignment_id: 'assignment-1',
        evidence_links: [],
      }).sourceCorrupt
    )
    assert.isTrue(
      mapLegacyWorkHistoryRow({
        id: 'history-2',
        user_id: 'user-1',
        task_id: 'task-1',
        task_assignment_id: 'assignment-1',
        evidence_links: null,
      }).sourceCorrupt
    )
  })
})
