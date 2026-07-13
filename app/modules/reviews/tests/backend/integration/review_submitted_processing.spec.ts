import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeProcessReviewSubmittedEventCommand } from '#composition/reviews/review-core/review_action_factory'
import { DomainEventDeliveryError } from '#modules/events/public_contracts/domain_event_delivery_error'
import type { ReviewSubmittedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'
import type { ReviewSubmittedEvent } from '#modules/reviews/events/review_events'
import FlaggedReview from '#modules/reviews/infra/models/review-core/flagged_review'
import SubmitReviewScenario from '#modules/reviews/tests/backend/support/submit_review_scenario'
import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, SkillFactory } from '#tests/helpers/factories'

interface OutboxRow {
  payload: ReviewSubmittedOutboxPayload
}

test.group('Integration | Review submitted durable processing', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await db.from('domain_event_outbox_replay_history').delete()
    await db.from('domain_event_outbox').delete()
    await db.from('review_submitted_processing_receipts').delete()
    await cleanupTestData()
  })

  async function createSubmission(): Promise<{
    event: ReviewSubmittedEvent
    revieweeId: string
  }> {
    const scenario = await SubmitReviewScenario.build()
    const thirdSkill = await SkillFactory.create({
      skill_name: `durable-review-${Date.now()}`,
    })
    await scenario.submitManager([
      scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L10),
      scenario.rating(scenario.skill2.id, CanonicalProficiencyLevelCode.L10),
      scenario.rating(thirdSkill.id, CanonicalProficiencyLevelCode.L10),
    ])
    const row = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:submitted')
      .where('aggregate_id', scenario.sessionId)
      .select('payload')
      .first()) as OutboxRow | undefined
    if (!row) throw new Error('Expected a durable review submitted event')
    return { event: row.payload, revieweeId: scenario.revieweeId }
  }

  test('persists one atomic anomaly result and one stable projection event on retry', async ({
    assert,
  }) => {
    const { event, revieweeId } = await createSubmission()
    const command = makeProcessReviewSubmittedEventCommand()

    await command.handle(event)
    await command.handle(event)

    const flags = await FlaggedReview.query().whereIn(
      'skill_review_id',
      event.skillReviewIds
    )
    const receipt = (await db
      .from('review_submitted_processing_receipts')
      .where('submission_id', event.submissionId)
      .first()) as { flagged_review_count: number | string } | undefined
    const projectionEvents = (await db
      .from('domain_event_outbox')
      .where(
        'event_name',
        'reviews:talent-explainability-projection:changed:v1'
      )
      .where('aggregate_id', revieweeId)) as Array<{
      payload: { revieweeUserId?: string }
    }>
    assert.equal(flags.filter((flag) => flag.flag_type === 'bulk_same_level').length, 1)
    assert.equal(Number(receipt?.flagged_review_count), flags.length)
    assert.lengthOf(projectionEvents, 1)
    assert.equal(projectionEvents[0]?.payload['revieweeUserId'], revieweeId)
  })

  test('rolls back receipt and anomaly writes when projection snapshot persistence fails', async ({
    assert,
  }) => {
    const { event } = await createSubmission()
    const forged = { ...event, revieweeId: '00000000-0000-0000-0000-000000000000' }

    let caught: unknown
    try {
      await makeProcessReviewSubmittedEventCommand().handle(forged)
    } catch (error) {
      caught = error
    }
    assert.instanceOf(caught, DomainEventDeliveryError)
    assert.equal(
      (caught as DomainEventDeliveryError).errorCode,
      'REVIEW_SUBMITTED_INVARIANT_VIOLATION'
    )
    assert.isFalse((caught as DomainEventDeliveryError).retryable)
    const receipts = await db
      .from('review_submitted_processing_receipts')
      .where('submission_id', event.submissionId)
    const flags = await FlaggedReview.query().whereIn('skill_review_id', event.skillReviewIds)
    assert.lengthOf(receipts, 0)
    assert.lengthOf(flags, 0)
  })

  test('aborted delivery never claims a receipt or persists anomaly side effects', async ({
    assert,
  }) => {
    const { event } = await createSubmission()
    const controller = new AbortController()
    controller.abort(new Error('domain event lease lost'))

    await assert.rejects(
      () =>
        makeProcessReviewSubmittedEventCommand().handle(event, {
          signal: controller.signal,
        }),
      /domain event lease lost/
    )

    const [receipts, flags] = await Promise.all([
      db
        .from('review_submitted_processing_receipts')
        .where('submission_id', event.submissionId),
      FlaggedReview.query().whereIn('skill_review_id', event.skillReviewIds),
    ])
    assert.lengthOf(receipts, 0)
    assert.lengthOf(flags, 0)
  })
})
