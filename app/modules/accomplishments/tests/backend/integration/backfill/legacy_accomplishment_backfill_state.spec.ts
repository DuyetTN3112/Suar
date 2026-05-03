import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import type {
  LegacyAccomplishmentBackfillCheckpoint,
  LegacyAccomplishmentSource,
  LegacyBackfillOutcome,
} from '#modules/accomplishments/actions/commands/legacy-backfill/run_legacy_accomplishment_backfill_command'
import LucidLegacyAccomplishmentBackfillCheckpointStore, {
  LucidLegacyAccomplishmentBackfillWriter,
} from '#modules/accomplishments/infra/adapters/backfill/lucid_legacy_accomplishment_backfill_state'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const scopeKey = `integration:${Date.now()}`
const source: LegacyAccomplishmentSource = {
  sourceId: `legacy-${Date.now()}`,
  userId: 'user-legacy-1',
  taskAssignmentId: 'assignment-legacy-1',
  taskId: 'task-legacy-1',
  hasImmutableAssignmentSnapshot: false,
  hasCompletionReport: false,
  hasGovernedReviewConfirmation: false,
  hasVerifiedClaim: false,
  hasSufficientEvidence: false,
  userConfirmedRetrospective: true,
  sourceCorrupt: false,
}
const outcome: LegacyBackfillOutcome = {
  sourceId: source.sourceId,
  userId: source.userId,
  classification: 'retrospective_user_confirmed',
  writable: true,
  reason: 'integration retrospective fact',
}

test.group('Integration | legacy accomplishment backfill durable state', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await db.from('accomplishment_legacy_backfill_facts').where('source_id', source.sourceId).delete()
    await db.from('accomplishment_legacy_backfill_runs').where('scope_key', scopeKey).delete()
  })

  test('round-trips checkpoints and idempotent retrospective facts', async ({ assert }) => {
    const checkpointStore = new LucidLegacyAccomplishmentBackfillCheckpointStore()
    const checkpoint: LegacyAccomplishmentBackfillCheckpoint = {
      scopeKey,
      cursor: source.sourceId,
      processedSourceIds: [source.sourceId],
    }
    await checkpointStore.save(checkpoint)
    assert.deepEqual(await checkpointStore.load(scopeKey), checkpoint)

    const writer = new LucidLegacyAccomplishmentBackfillWriter(() => '2026-08-09T12:00:00.000Z')
    await writer.persistRetrospective({ source, outcome })
    await writer.persistRetrospective({ source, outcome })

    assert.equal(
      await db
        .from('accomplishment_legacy_backfill_facts')
        .where('source_id', source.sourceId)
        .count('* as total')
        .first()
        .then((row) => Number((row as { total?: string | number } | undefined)?.total ?? 0)),
      1
    )
  })

  test('rejects an outcome that is not retrospective-writable', async ({ assert }) => {
    const writer = new LucidLegacyAccomplishmentBackfillWriter()
    await assert.rejects(
      () =>
        writer.persistRetrospective({
          source,
          outcome: { ...outcome, writable: false },
        }),
      InvariantViolationException
    )
  })
})
