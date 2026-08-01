import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  makeProcessDisputeResolvedEventCommand,
  makeStartAiDisputeEvaluationCommand,
} from '#composition/review_action_factory'
import { AdonisDomainEventDispatcher } from '#modules/events/infra/adapters/adonis_domain_event_dispatcher'
import { PostgresDomainEventOutboxRepository } from '#modules/events/infra/postgres_domain_event_outbox_repository'
import { DomainEventOutboxWorker } from '#modules/events/infra/workers/domain_event_outbox_worker'
import type { DisputeResolvedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'
import CreateReviewDisputeCommand from '#modules/reviews/actions/commands/create_review_dispute_command'
import ResolveReviewDisputeCommand from '#modules/reviews/actions/commands/resolve_review_dispute_command'
import RespondToReviewDisputeCommand from '#modules/reviews/actions/commands/respond_to_review_dispute_command'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import LucidReviewConfirmationDisputeUnitOfWork from '#modules/reviews/infra/adapters/lucid_review_confirmation_dispute_unit_of_work'
import LucidReviewDisputeResolutionUnitOfWork from '#modules/reviews/infra/adapters/lucid_review_dispute_resolution_unit_of_work'
import LucidReviewDisputeUnitOfWork from '#modules/reviews/infra/adapters/lucid_review_dispute_unit_of_work'
import {
  PROFILE_UPDATE_ACTION,
  REVIEWER_CREDIBILITY_ACTION,
} from '#modules/reviews/public_contracts/review_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

interface DurableDisputeEventEvidence {
  id: string
  status: string
  aggregate_type: string
  payload: DisputeResolvedOutboxPayload
}

const confirmationDisputes = new LucidReviewConfirmationDisputeUnitOfWork()

interface DisputeReceiptEvidence {
  state: string
  external_effect_cursor: string | number
  external_effect_total: string | number
}

interface TalentReindexEvidence {
  status: string
  aggregate_type: string
  payload: {
    userId: string
    sourceEventName: string
    sourceEventId: string
  }
}

interface CountEvidence {
  total: string | number
}

interface OutboxErrorEvidence {
  last_error_code: string | null
}

async function countAuditEvents(
  action: string,
  entityType: string,
  entityId: string
): Promise<number> {
  const result = (await db
    .from('audit_events')
    .where('action', action)
    .where('entity_type', entityType)
    .where('entity_id', entityId)
    .count('* as count')) as { count: number | string }[]

  return Number(result[0]?.count ?? 0)
}

async function buildDisputeScenario() {
  const superadmin = await UserFactory.create({ system_role: 'system_admin' })
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  const reviewer = await UserFactory.create()

  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: reviewee.id,
    org_role: 'org_member',
    status: 'approved',
  })

  const project = await ProjectFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    owner_id: owner.id,
  })
  const sprintId = testId()
  await db.table('project_sprints').insert({
    id: sprintId,
    organization_id: org.id,
    project_id: project.id,
    name: 'Review dispute observability sprint',
    goal: 'Provide same-project and same-sprint context for dispute arbitration.',
    status: 'active',
    starts_at: DateTime.utc().minus({ days: 7 }).toSQL(),
    ends_at: DateTime.utc().plus({ days: 7 }).toSQL(),
    created_by: owner.id,
    closed_by: null,
    review_opened_at: null,
    review_closed_at: null,
  })

  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    project_id: project.id,
    project_sprint_id: sprintId,
    assigned_to: reviewee.id,
  })
  const relatedTask = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    project_id: project.id,
    project_sprint_id: sprintId,
    assigned_to: reviewee.id,
    title: 'Related observability sprint task',
    status: 'done',
  })

  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })

  const session = await ReviewSessionFactory.create({
    task_assignment_id: assignment.id,
    reviewee_id: reviewee.id,
    status: 'completed',
    completed_at: DateTime.now(),
  })

  const reviewedSkill = await SkillFactory.create()
  await SkillReviewFactory.create({
    review_session_id: session.id,
    reviewer_id: reviewer.id,
    skill_id: reviewedSkill.id,
  })

  return {
    superadmin,
    org,
    owner,
    reviewee,
    reviewer,
    project,
    sprintId,
    task,
    relatedTask,
    assignment,
    session,
  }
}

test.group('Integration | Review Dispute Observability', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await db.from('dispute_resolved_processing_receipts').delete()
    await db.from('domain_event_outbox_replay_history').delete()
    await db.from('domain_event_outbox').delete()
    await cleanupTestData()
  })

  test('create dispute persists structured workflow audit evidence', async ({ assert }) => {
    const scenario = await buildDisputeScenario()
    const command = new CreateReviewDisputeCommand(
      makeSystemReviewActionContext(scenario.reviewee.id),
      confirmationDisputes
    )

    const dispute = await command.execute({
      review_session_id: scenario.session.id,
      dispute_reason: 'Need second review',
      disputed_dimensions: { code_quality: true },
      disputed_skill_reviews: [],
      requested_outcome: 'adjust_score',
    })

    assert.equal(await countAuditEvents('review.dispute.created', 'review_dispute', dispute.id), 1)
  })

  test('respond, resolve, and queue ai evaluation persist structured workflow audit evidence', async ({
    assert,
  }) => {
    const scenario = await buildDisputeScenario()
    const createCommand = new CreateReviewDisputeCommand(
      makeSystemReviewActionContext(scenario.reviewee.id),
      confirmationDisputes
    )
    const dispute = await createCommand.execute({
      review_session_id: scenario.session.id,
      dispute_reason: 'Need evidence review',
      disputed_dimensions: { communication: true },
      disputed_skill_reviews: [],
      requested_outcome: 'adjust_score',
    })

    const respondCommand = new RespondToReviewDisputeCommand(
      makeSystemReviewActionContext(scenario.reviewer.id),
      new LucidReviewDisputeUnitOfWork()
    )
    const response = await respondCommand.execute({
      dispute_id: dispute.id,
      body: 'Reviewer context attached',
      visibility: 'all_parties',
    })

    await db.table('review_dispute_case_files').insert({
      id: testId(),
      dispute_id: dispute.id,
      case_version: 1,
      created_by: scenario.superadmin.id,
      task_snapshot: JSON.stringify({
        id: scenario.task.id,
        task_id: scenario.task.id,
        organization_id: scenario.org.id,
        project_id: scenario.project.id,
        project_sprint_id: scenario.sprintId,
        organization: {
          id: scenario.org.id,
          name: scenario.org.name,
        },
        project: {
          id: scenario.project.id,
          name: scenario.project.name,
          sprint_id: scenario.sprintId,
        },
        related_project_tasks: [
          {
            id: scenario.relatedTask.id,
            title: scenario.relatedTask.title,
            project_id: scenario.project.id,
          },
        ],
        sprint_peer_tasks: [
          {
            id: scenario.relatedTask.id,
            title: scenario.relatedTask.title,
            project_sprint_id: scenario.sprintId,
          },
        ],
      }),
      required_skills_snapshot: JSON.stringify([]),
      acceptance_criteria_snapshot: JSON.stringify({}),
      assignment_snapshot: JSON.stringify({ assignment_id: scenario.assignment.id }),
      submission_snapshot: JSON.stringify({ submission_id: 'submission-1' }),
      review_snapshot: JSON.stringify({ overall_feedback: 'original review feedback' }),
      skill_reviews_snapshot: JSON.stringify([{ id: 'skill-review-1' }]),
      evidences_snapshot: JSON.stringify([{ id: 'evidence-1' }]),
      self_assessment_snapshot: JSON.stringify({}),
      task_comments_snapshot: JSON.stringify([]),
      task_history_snapshot: JSON.stringify([]),
      reviewee_profile_context_snapshot: JSON.stringify({
        reviewee_id: scenario.reviewee.id,
        user_id: scenario.reviewee.id,
        profile: { summary: { role: 'reviewee' } },
        work_schedule: [{ id: scenario.task.id, title: scenario.task.title }],
        task_history: [],
      }),
      reviewer_context_snapshot: JSON.stringify({
        reviewer_id: scenario.reviewer.id,
        user_id: scenario.reviewer.id,
        profile: { summary: { role: 'reviewer' } },
        work_schedule: [{ id: scenario.relatedTask.id, title: scenario.relatedTask.title }],
        task_history: [],
      }),
      dispute_claim_snapshot: JSON.stringify({
        requested_outcome: 'adjust_score',
        dispute_comments: [
          { author_context: 'reviewee', body: 'Reviewee dispute message' },
          { author_context: 'reviewer', body: 'Reviewer response message' },
        ],
      }),
      completeness_score: 100,
      missing_data: JSON.stringify([]),
      created_at: DateTime.now().toISO(),
    })

    const resolveCommand = new ResolveReviewDisputeCommand(
      makeSystemReviewActionContext(scenario.superadmin.id),
      new LucidReviewDisputeResolutionUnitOfWork()
    )
    process.env['NODE_ENV'] = 'testing'
    const aiCommand = makeStartAiDisputeEvaluationCommand(
      makeSystemReviewActionContext(scenario.superadmin.id)
    )
    const evaluation = await aiCommand.execute({
      dispute_id: dispute.id,
      provider: 'ai_council',
    })
    const resolved = await resolveCommand.execute({
      dispute_id: dispute.id,
      final_decision: 'adjust_score',
      final_rationale: 'Evidence supports adjustment',
      profile_update_action: PROFILE_UPDATE_ACTION.RECALCULATE,
      reviewer_credibility_action: REVIEWER_CREDIBILITY_ACTION.MARK_DISPUTED,
    })

    assert.equal(response.dispute_id, dispute.id)
    assert.equal(resolved.id, dispute.id)
    assert.equal(evaluation.dispute_id, dispute.id)
    assert.deepEqual(evaluation.request_payload.acceptance_criteria, {})
    assert.deepEqual(evaluation.request_payload.self_assessment, {})
    assert.deepEqual(evaluation.request_payload.task_history, [])
    assert.equal(evaluation.request_payload.completeness_score, 100)
    assert.deepEqual(evaluation.request_payload.missing_data, [])
    assert.equal(
      await countAuditEvents('review.dispute.response_created', 'review_dispute', dispute.id),
      1
    )
    assert.equal(await countAuditEvents('review.dispute.resolved', 'review_dispute', dispute.id), 1)
    const durableEvent = (await db
      .from('domain_event_outbox')
      .where('event_name', 'dispute:resolved')
      .where('aggregate_id', dispute.id)
      .firstOrFail()) as unknown as DurableDisputeEventEvidence
    assert.equal(durableEvent['status'], 'pending')
    assert.equal(durableEvent['aggregate_type'], 'review_dispute')
    assert.deepEqual(durableEvent['payload'], {
      disputeId: dispute.id,
      reviewSessionId: scenario.session.id,
      revieweeId: scenario.reviewee.id,
      reviewerIds: [scenario.reviewer.id],
      resolvedBy: scenario.superadmin.id,
      finalDecision: 'adjust_score',
      profileUpdateAction: PROFILE_UPDATE_ACTION.RECALCULATE,
      reviewerCredibilityAction: REVIEWER_CREDIBILITY_ACTION.MARK_DISPUTED,
    })
    const delivery = await new DomainEventOutboxWorker({
      workerId: `dispute-resolution-test:${randomUUID()}`,
      repository: new PostgresDomainEventOutboxRepository(),
      dispatcher: new AdonisDomainEventDispatcher(),
      batchSize: 10,
      concurrency: 1,
    }).runOnce()
    if (delivery.deadLettered > 0 || delivery.retried > 0) {
      const failedEvent = (await db
        .from('domain_event_outbox')
        .select('last_error_code')
        .where('id', durableEvent['id'])
        .firstOrFail()) as unknown as OutboxErrorEvidence
      let diagnostic = 'unavailable'
      try {
        await makeProcessDisputeResolvedEventCommand().handle(durableEvent['payload'])
      } catch (error) {
        diagnostic =
          error instanceof Error
            ? `${error.name}:${error.message}; cause=${
                error.cause instanceof Error ? `${error.cause.name}:${error.cause.message}` : 'none'
              }`
            : 'UnknownError'
      }
      throw new Error(
        `Dispute resolved delivery failed with ${String(
          failedEvent.last_error_code
        )}; diagnostic=${diagnostic}`
      )
    }
    assert.deepEqual(delivery, {
      claimed: 2,
      processed: 2,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })
    await scenario.reviewer.refresh()
    assert.equal(scenario.reviewer.credibility_data?.total_reviews_given, 1)
    assert.equal(scenario.reviewer.credibility_data?.disputed_reviews, 1)
    assert.equal(scenario.reviewer.credibility_data?.credibility_score, 20)
    const receipt = (await db
      .from('dispute_resolved_processing_receipts')
      .where('dispute_id', dispute.id)
      .firstOrFail()) as unknown as DisputeReceiptEvidence
    assert.equal(receipt['state'], 'completed')
    assert.equal(
      Number(receipt['external_effect_cursor']),
      Number(receipt['external_effect_total'])
    )
    const talentReindex = (await db
      .from('domain_event_outbox')
      .where('event_name', 'search:talent-reindex-requested')
      .where('aggregate_id', scenario.reviewee.id)
      .firstOrFail()) as unknown as TalentReindexEvidence
    assert.equal(talentReindex.status, 'pending')
    assert.equal(talentReindex.aggregate_type, 'user_talent')
    assert.deepInclude(talentReindex.payload, {
      userId: scenario.reviewee.id,
      sourceEventName: 'reviews:talent-explainability-projection:changed:v1',
    })
    assert.match(talentReindex.payload['sourceEventId'], /^\d+$/)
    const auditsAfterDeliveryRow = (await db
      .from('audit_events')
      .count('* as total')
      .firstOrFail()) as unknown as CountEvidence
    const auditsAfterDelivery = Number(auditsAfterDeliveryRow['total'])
    await makeProcessDisputeResolvedEventCommand().handle(durableEvent['payload'])
    const auditsAfterReplayRow = (await db
      .from('audit_events')
      .count('* as total')
      .firstOrFail()) as unknown as CountEvidence
    const auditsAfterReplay = Number(auditsAfterReplayRow['total'])
    assert.equal(auditsAfterReplay, auditsAfterDelivery)
    assert.equal(
      await countAuditEvents(
        'review.dispute.ai_evaluation.completed',
        'review_dispute',
        dispute.id
      ),
      1
    )
  }).timeout(10_000)

  test('dead-letters a forged dispute reviewer before applying projections', async ({ assert }) => {
    const scenario = await buildDisputeScenario()
    const disputeId = testId()
    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: scenario.session.id,
      task_assignment_id: scenario.assignment.id,
      task_id: scenario.task.id,
      reviewee_id: scenario.reviewee.id,
      opened_by: scenario.reviewee.id,
      status: 'resolved',
      dispute_reason: 'Forged delivery guard fixture',
      disputed_dimensions: JSON.stringify({}),
      disputed_skill_reviews: JSON.stringify([]),
      requested_outcome: 'adjust_score',
      resolved_at: DateTime.utc().toSQL(),
      resolved_by: scenario.superadmin.id,
      final_decision: 'adjust_score',
      final_rationale: 'Resolved fixture',
      profile_update_action: PROFILE_UPDATE_ACTION.RECALCULATE,
      reviewer_credibility_action: REVIEWER_CREDIBILITY_ACTION.MARK_DISPUTED,
    })
    const repository = new PostgresDomainEventOutboxRepository()
    await db.transaction((trx) =>
      repository.stage(trx, {
        eventName: 'dispute:resolved',
        dedupeKey: `dispute-resolved:${disputeId}`,
        aggregateType: 'review_dispute',
        aggregateId: disputeId,
        payload: {
          disputeId,
          reviewSessionId: scenario.session.id,
          revieweeId: scenario.reviewee.id,
          reviewerIds: [scenario.owner.id],
          resolvedBy: scenario.superadmin.id,
          finalDecision: 'adjust_score',
          profileUpdateAction: PROFILE_UPDATE_ACTION.RECALCULATE,
          reviewerCredibilityAction: REVIEWER_CREDIBILITY_ACTION.MARK_DISPUTED,
        },
      })
    )

    const result = await new DomainEventOutboxWorker({
      workerId: `dispute-forgery-test:${randomUUID()}`,
      repository,
      dispatcher: new AdonisDomainEventDispatcher(),
      batchSize: 10,
      concurrency: 1,
    }).runOnce()
    assert.deepEqual(result, {
      claimed: 1,
      processed: 0,
      retried: 0,
      deadLettered: 1,
      leaseLost: 0,
    })
    const outbox = (await db
      .from('domain_event_outbox')
      .select('last_error_code')
      .where('event_name', 'dispute:resolved')
      .where('aggregate_id', disputeId)
      .firstOrFail()) as unknown as OutboxErrorEvidence
    assert.equal(outbox.last_error_code, 'DISPUTE_RESOLVED_INVARIANT_VIOLATION')
    const receipt: unknown = await db
      .from('dispute_resolved_processing_receipts')
      .where('dispute_id', disputeId)
      .first()
    assert.isNull(receipt)
  })
})
