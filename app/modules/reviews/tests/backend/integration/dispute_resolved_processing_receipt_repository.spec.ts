import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { DisputeResolvedProcessingReceiptRepository } from '#modules/reviews/infra/repositories/dispute_resolved_processing_receipt_repository'
import { DisputeResolvedReceiptCollisionException } from '#modules/reviews/public_contracts/dispute_resolved_processing_receipt'

const payload = {
  disputeId: 'receipt-dispute-1',
  reviewSessionId: 'receipt-session-1',
  revieweeId: 'receipt-reviewee-1',
  reviewerIds: ['receipt-reviewer-1'],
  resolvedBy: 'receipt-admin-1',
  finalDecision: 'adjust_score' as const,
  profileUpdateAction: 'recalculate_after_adjustment' as const,
  reviewerCredibilityAction: 'mark_disputed_review' as const,
}

const effects = {
  version: 1 as const,
  skillScoreUpdated: [
    {
      userId: payload.revieweeId,
      skillId: 'receipt-skill-1',
      oldScore: 40,
      newScore: 80,
    },
  ],
  talentProjection: null,
}

test.group('Dispute resolved processing receipt repository', (group) => {
  const repository = new DisputeResolvedProcessingReceiptRepository()

  group.each.setup(async () => {
    await db.from('dispute_resolved_processing_receipts').delete()
  })
  group.each.teardown(async () => {
    await db.from('dispute_resolved_processing_receipts').delete()
  })

  test('atomically persists effects and checkpoints each delivery', async ({ assert }) => {
    await db.transaction(async (trx) => {
      const claim = await repository.claimOrLoadDatabaseApplied(trx, payload)
      assert.isTrue(claim.inserted)
      assert.isNull(claim.receipt.externalEffects)
      const saved = await repository.saveExternalEffects(
        trx,
        payload.disputeId,
        effects
      )
      assert.equal(saved.externalEffectCursor, 0)
      assert.equal(saved.externalEffectTotal, 2)
    })

    const first = await repository.advanceExternalEffectCursor({
      disputeId: payload.disputeId,
      expectedCursor: 0,
      expectedEffectKey: 'skill_score_updated:0',
    })
    assert.isTrue(first.advanced)
    assert.equal(first.receipt.state, 'database_applied')

    const duplicate = await repository.advanceExternalEffectCursor({
      disputeId: payload.disputeId,
      expectedCursor: 0,
      expectedEffectKey: 'skill_score_updated:0',
    })
    assert.isFalse(duplicate.advanced)
    assert.equal(duplicate.receipt.externalEffectCursor, 1)

    const completed = await repository.advanceExternalEffectCursor({
      disputeId: payload.disputeId,
      expectedCursor: 1,
      expectedEffectKey: 'profile_review_cache_invalidation',
    })
    assert.equal(completed.receipt.state, 'completed')
    assert.equal(
      completed.receipt.externalEffectCursor,
      completed.receipt.externalEffectTotal
    )
  })

  test('rolls back an incomplete claim and rejects payload identity reuse', async ({
    assert,
  }) => {
    await assert.rejects(async () => {
      await db.transaction(async (trx) => {
        await repository.claimOrLoadDatabaseApplied(trx, payload)
        throw new Error('force rollback')
      })
    }, 'force rollback')
    const rolledBackReceipt: unknown = await db
      .from('dispute_resolved_processing_receipts')
      .where('dispute_id', payload.disputeId)
      .first()
    assert.isNull(rolledBackReceipt)

    await db.transaction(async (trx) => {
      await repository.claimOrLoadDatabaseApplied(trx, payload)
      await repository.saveExternalEffects(trx, payload.disputeId, effects)
    })
    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.claimOrLoadDatabaseApplied(trx, {
            ...payload,
            revieweeId: 'different-reviewee',
          })
        ),
      DisputeResolvedReceiptCollisionException
    )
  })

  test('refuses to commit a receipt without a durable effect plan', async ({ assert }) => {
    await assert.rejects(async () => {
      await db.transaction(async (trx) => {
        await repository.claimOrLoadDatabaseApplied(trx, payload)
        await trx.rawQuery(
          'SET CONSTRAINTS dispute_resolved_receipts_effects_saved_trigger IMMEDIATE'
        )
      })
    }, /dispute resolved receipt must persist external effects before commit/)
  })
})
