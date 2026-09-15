import { test } from '@japa/runner'

import {
  configureReviewDisputesTestGroup,
  createDisputeScenario,
  db,
  parseSnapshot,
  type PlatformEvent,
  platformOperationalLogger,
} from './support/review_disputes_test_support.js'

test.group('Integration | Review disputes AI arbitration contracts', (group) => {
  configureReviewDisputesTestGroup(group)

  test('classic report stages the canonical Clawagent arbitration contract', async ({
    assert,
    client,
  }) => {
    const { owner, reviewee, disputeId } = await createDisputeScenario()

    const commentResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'Reviewee asks for AI arbitration after review evidence was missed.',
        visibility: 'all_parties',
      })
    commentResponse.assertStatus(201)

    const respondResponse = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Reviewer side gives counter context before admin escalation.',
        visibility: 'all_parties',
      })
    respondResponse.assertStatus(201)

    const reportResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/report`)
      .loginAs(reviewee)
      .json({ escalationReason: 'Need Clawagent arbitration before admin decision.' })
    reportResponse.assertStatus(200)

    const aiResult = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'review_dispute')
      .where('source_id', disputeId)
      .firstOrFail()) as Record<string, unknown>
    const triggerPayload = parseSnapshot(aiResult['trigger_payload']) as {
      evaluation_id: string
      source_type: string
      source_id: string
      case_file_id: string
      callbackUrl: string
      context: {
        source_type?: string
        source_id?: string
        review_dispute_id: string
        case_file_id: string
      }
    }
    assert.equal(triggerPayload.source_type, 'review_dispute')
    assert.equal(triggerPayload.source_id, disputeId)
    assert.match(triggerPayload.callbackUrl, /\/api\/public\/ai-disputes\/callback$/u)
    assert.equal(triggerPayload.context.review_dispute_id, disputeId)
    assert.equal(triggerPayload.context.case_file_id, triggerPayload.case_file_id)

    const dispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(aiResult['status'], 'queued')
    assert.isNull(aiResult['external_run_id'])
    assert.equal(aiResult['case_file_id'], triggerPayload.case_file_id)
    assert.equal(dispute['status'], 'admin_reviewing')
  })

  test('report still succeeds and logs AI queue skip when automation actor is missing', async ({
    assert,
    client,
  }) => {
    const { superadmin, owner, reviewee, disputeId } = await createDisputeScenario()
    await db
      .from('users')
      .where('id', superadmin.id)
      .update({ system_role: 'registered_user' })

    const commentResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'Reviewee asks for admin review even if AI automation actor is missing.',
        visibility: 'all_parties',
      })
    commentResponse.assertStatus(201)

    const respondResponse = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Counterparty responded before escalation.',
        visibility: 'all_parties',
      })
    respondResponse.assertStatus(201)

    const originalLog: typeof platformOperationalLogger.log =
      platformOperationalLogger.log.bind(platformOperationalLogger)
    const events: Array<{ level: string; event: PlatformEvent }> = []
    platformOperationalLogger.log = (level: string, event: PlatformEvent) => {
      events.push({ level, event })
    }

    try {
      const reportResponse = await client
        .post(`/api/reviews/disputes/${disputeId}/report`)
        .loginAs(reviewee)
        .json({ escalationReason: 'Admin should receive the report even if AI queue skips.' })
      reportResponse.assertStatus(200)
    } finally {
      platformOperationalLogger.log = originalLog
    }

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'review_dispute')
      .where('source_id', disputeId)
      .first()) as Record<string, unknown> | null
    assert.isNull(evaluation)
    assert.isTrue(
      events.some(
        ({ level, event }) =>
          level === 'warn' &&
          event.event_name === 'review.dispute.ai_evaluation.auto_queue_skipped' &&
          event.stage === 'skipped' &&
          event.target?.id === disputeId &&
          event.change?.['source_type'] === 'review_dispute' &&
          event.error?.['message'] === 'No automation actor available'
      )
    )
  })
})
