import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { ReviewConfirmedProcessingReceiptRepository } from '#modules/reviews/infra/repositories/review_confirmed_processing_receipt_repository'
import { ReviewConfirmedReceiptCollisionException } from '#modules/reviews/public_contracts/review_confirmed_processing_receipt'

const confirmationId = 'receipt-confirmation-1'
const payload = {
  confirmationId,
  reviewSessionId: 'receipt-session-1',
  revieweeId: 'receipt-reviewee-1',
  reviewerIds: ['receipt-reviewer-1', 'receipt-reviewer-2'],
  confirmedBy: 'receipt-actor-1',
  action: 'confirmed' as const,
}
const effects = {
  version: 1 as const,
  skillScoreUpdated: [
    {
      userId: 'receipt-reviewee-1',
      skillId: 'receipt-skill-1',
      oldScore: 40,
      newScore: 80,
    },
  ],
  talentProjection: {
    contractVersion: 1 as const,
    eventType: 'reviews.talent_explainability_projection_changed.v1' as const,
    revieweeUserId: 'receipt-reviewee-1',
    underDisputeSkillsCount: 0,
    latestConfidenceSignal: 'high' as const,
    sourceRevision: 'receipt-source-revision-1',
    occurredAt: '2026-07-26T08:00:00.000Z',
  },
}

test.group('Review confirmed processing receipt repository', (group) => {
  const repository = new ReviewConfirmedProcessingReceiptRepository()

  group.each.setup(async () => {
    await db.from('review_confirmed_processing_receipts').delete()
  })

  group.each.teardown(async () => {
    await db.from('review_confirmed_processing_receipts').delete()
  })

  test('persists the database phase, retry metadata, and completion idempotently', async ({
    assert,
  }) => {
    await db.transaction(async (trx) => {
      const claimed = await repository.claimOrLoadDatabaseApplied(trx, {
        eventVersion: 1,
        payload,
      })
      assert.isTrue(claimed.inserted)
      assert.isNull(claimed.receipt.externalEffects)

      const saved = await repository.saveExternalEffects(
        trx,
        confirmationId,
        effects,
        new Date('2026-07-26T08:00:01.000Z')
      )
      assert.deepEqual(saved.externalEffects, effects)
    })

    await db.transaction(async (trx) => {
      const replay = await repository.claimOrLoadDatabaseApplied(trx, {
        eventVersion: 1,
        payload,
      })
      assert.isFalse(replay.inserted)
      assert.equal(replay.receipt.state, 'database_applied')
      assert.deepEqual(replay.receipt.externalEffects, effects)
    })

    const failed = await repository.recordExternalFailure(
      confirmationId,
      'REVIEW_EXTERNAL_DELIVERY_FAILED',
      new Date('2026-07-26T08:00:02.000Z')
    )
    assert.equal(failed.externalAttemptCount, 1)
    assert.equal(failed.lastExternalErrorCode, 'REVIEW_EXTERNAL_DELIVERY_FAILED')

    await assert.rejects(
      () =>
        repository.markCompleted(
          confirmationId,
          new Date('2026-07-26T08:00:03.000Z')
        ),
      /before every external effect checkpoint/
    )

    const skillCheckpoint = await repository.advanceExternalEffectCursor({
      confirmationId,
      expectedCursor: 0,
      expectedEffectKey: 'skill_score_updated:0',
      now: new Date('2026-07-26T08:00:03.000Z'),
    })
    assert.isTrue(skillCheckpoint.advanced)
    assert.equal(skillCheckpoint.receipt.externalEffectCursor, 1)

    const replayedSkillCheckpoint = await repository.advanceExternalEffectCursor({
      confirmationId,
      expectedCursor: 0,
      expectedEffectKey: 'skill_score_updated:0',
      now: new Date('2026-07-26T08:00:03.500Z'),
    })
    assert.isFalse(replayedSkillCheckpoint.advanced)
    assert.equal(replayedSkillCheckpoint.receipt.externalEffectCursor, 1)

    await repository.advanceExternalEffectCursor({
      confirmationId,
      expectedCursor: 1,
      expectedEffectKey: 'profile_review_cache_invalidation',
      now: new Date('2026-07-26T08:00:04.000Z'),
    })
    const finalCheckpoint = await repository.advanceExternalEffectCursor({
      confirmationId,
      expectedCursor: 2,
      expectedEffectKey: 'talent_projection',
      now: new Date('2026-07-26T08:00:05.000Z'),
    })
    const completed = finalCheckpoint.receipt
    assert.equal(completed.state, 'completed')
    assert.equal(completed.externalEffectCursor, completed.externalEffectTotal)
    assert.isNull(completed.lastExternalErrorCode)

    const replayedCompletion = await repository.markCompleted(
      confirmationId,
      new Date('2026-07-26T08:00:06.000Z')
    )
    assert.equal(replayedCompletion.completedAt?.toISOString(), '2026-07-26T08:00:05.000Z')
  })

  test('rolls back the claim with caller database work', async ({ assert }) => {
    await assert.rejects(async () => {
      await db.transaction(async (trx) => {
        await repository.claimOrLoadDatabaseApplied(trx, {
          eventVersion: 1,
          payload,
        })
        throw new Error('force caller transaction rollback')
      })
    }, 'force caller transaction rollback')

    const row: unknown = await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', confirmationId)
      .first()
    assert.isNull(row)
  })

  test('rejects committing a new receipt without stable external effects', async ({ assert }) => {
    await assert.rejects(async () => {
      await db.transaction(async (trx) => {
        await repository.claimOrLoadDatabaseApplied(trx, {
          eventVersion: 1,
          payload,
        })
        await trx.rawQuery(
          'SET CONSTRAINTS review_confirmed_receipts_effects_saved_trigger IMMEDIATE'
        )
      })
    }, /review confirmed receipt must persist external effects before commit/)

    const row: unknown = await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', confirmationId)
      .first()
    assert.isNull(row)
  })

  test('raises a permanent typed collision for confirmation identity reuse', async ({ assert }) => {
    await db.transaction(async (trx) => {
      await repository.claimOrLoadDatabaseApplied(trx, {
        eventVersion: 1,
        payload,
      })
      await repository.saveExternalEffects(trx, confirmationId, effects)
    })

    await assert.rejects(
      () =>
        db.transaction(async (trx) => {
          await repository.claimOrLoadDatabaseApplied(trx, {
            eventVersion: 1,
            payload: { ...payload, revieweeId: 'different-reviewee' },
          })
        }),
      ReviewConfirmedReceiptCollisionException
    )
  })

  test('serializes concurrent duplicate claims and reuses the committed receipt', async ({
    assert,
  }) => {
    let releaseFirstTransaction: (() => void) | undefined
    const holdFirstTransaction = new Promise<void>((resolve) => {
      releaseFirstTransaction = resolve
    })
    let firstClaimed: (() => void) | undefined
    const firstClaimedPromise = new Promise<void>((resolve) => {
      firstClaimed = resolve
    })

    const first = db.transaction(async (trx) => {
      const claimed = await repository.claimOrLoadDatabaseApplied(trx, {
        eventVersion: 1,
        payload,
      })
      assert.isTrue(claimed.inserted)
      firstClaimed?.()
      await holdFirstTransaction
      await repository.saveExternalEffects(trx, confirmationId, effects)
    })

    await firstClaimedPromise
    let secondResolved = false
    const second = db
      .transaction((trx) =>
        repository.claimOrLoadDatabaseApplied(trx, {
          eventVersion: 1,
          payload,
        })
      )
      .then((result) => {
        secondResolved = true
        return result
      })

    await Promise.resolve()
    assert.isFalse(secondResolved)
    releaseFirstTransaction?.()
    await first
    const duplicate = await second

    assert.isFalse(duplicate.inserted)
    assert.deepEqual(duplicate.receipt.externalEffects, effects)
  })
})
