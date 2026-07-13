import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  reviewMetricsReader,
  reviewSessionReads,
  reviewTalentFactSources,
} from '#composition/reviews/review-core/review_action_factory'
import { reviewExternalDependencies } from '#composition/reviews/review-core/review_external_dependencies_composition'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import type {
  DomainEventOutboxRepository,
  ReviewConfirmedOutboxPayload,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import { AdonisDomainEventDispatcher } from '#modules/events/infra/adapters/domain-event-outbox-administration/adonis_domain_event_dispatcher'
import { PostgresDomainEventOutboxRepository } from '#modules/events/infra/repositories/domain-event-outbox-administration/postgres_domain_event_outbox_repository'
import { DomainEventOutboxWorker } from '#modules/events/infra/adapters/domain-event-outbox-administration/domain_event_outbox_worker'
import ConfirmReviewCommand from '#modules/reviews/actions/commands/review-submission/confirm_review_command'
import ProcessReviewConfirmedEventCommand from '#modules/reviews/actions/commands/review-submission/process_review_confirmed_event_command'
import { ConfirmReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewExternalEffectPublisher } from '#modules/reviews/actions/ports/outbound/review_external_effects'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import LucidReviewConfirmationDisputeUnitOfWork from '#modules/reviews/infra/adapters/disputes/lucid_review_confirmation_dispute_unit_of_work'
import {
  ReviewObservationRepository,
  type CreateReviewObservationInput,
} from '#modules/reviews/infra/repositories/observation/review_observation_repository'
import {
  LucidReviewConfirmedReceiptStore,
  LucidReviewProjectionLock,
} from '#modules/reviews/infra/adapters/review-core/lucid_review_event_processing'
import { LucidReviewTransactionRunner } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'
import ReviewSession from '#modules/reviews/infra/models/review-session/review_session'
import {
  ReviewDisputeStatus,
  ReviewSessionStatus,
} from '#modules/reviews/public_contracts/review_constants'
import type { TalentExplainabilityProjectionChangedV1 } from '#modules/reviews/public_contracts/talent_explainability_projection_v1'
import User from '#modules/users/infra/models/profile/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  TaskFactory,
  TaskAssignmentFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

interface ReviewDisputeRow {
  review_session_id: string
  reviewee_id: string
  opened_by: string
  status: ReviewDisputeStatus
  requested_outcome: string
}

const confirmationDisputes = new LucidReviewConfirmationDisputeUnitOfWork()
const reviewObservations = new ReviewObservationRepository()

function reviewHash(character: string): TvaSha256 {
  return `sha256:${character.repeat(64)}`
}

function makeConfirmReviewCommand(userId: string): ConfirmReviewCommand {
  return new ConfirmReviewCommand(makeSystemReviewActionContext(userId), confirmationDisputes)
}

interface ReviewConfirmedOutboxRow {
  event_name: string
  status: string
  aggregate_type: string
  aggregate_id: string
  payload: Record<string, unknown> & {
    confirmationId: string
    reviewSessionId: string
  }
}

interface CountRow {
  total: string | number
}

interface OutboxEvidenceRow {
  id: string
  payload: ReviewConfirmedOutboxPayload
}

interface OutboxErrorRow {
  last_error_code: string | null
}

interface DeadLetterEvidenceRow {
  status: string
  last_error_code: string | null
}

interface ReceiptEvidenceRow {
  state: string
  external_effects_saved_at: Date | null
  external_effect_cursor: string | number
  external_effect_total: string | number | null
  external_attempt_count: string | number
  last_external_error_code: string | null
}

interface TalentReindexOutboxEvidence {
  status: string
  aggregate_type: string
  payload: {
    userId: string
    sourceEventName: string
    sourceEventId: string
  }
}

const PIPELINE_AUDIT_ACTIONS = [
  'recalculate_user_skill_score',
  'calculate_performance_score',
  'calculate_trust_score',
  'build_user_work_history',
  'upsert_user_performance_stats',
  'upsert_user_domain_expertise',
  'refresh_user_profile_aggregates',
] as const

test.group('Integration | Confirm Review', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.setup((t) => {
    t.timeout(10000)
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await db.from('review_confirmed_processing_receipts').delete()
    await db.from('domain_event_outbox_replay_history').delete()
    await db.from('domain_event_outbox').delete()
    await cleanupTestData()
  })

  async function drainReviewDomainEvents() {
    const result = await new DomainEventOutboxWorker({
      workerId: `confirm-review-test:${randomUUID()}`,
      dispatcher: new AdonisDomainEventDispatcher(),
      batchSize: 10,
      concurrency: 1,
    }).runOnce()
    if (result.retried > 0) {
      const row = (await db
        .from('domain_event_outbox')
        .select('last_error_code')
        .where('event_name', 'review:confirmed')
        .first()) as unknown as OutboxErrorRow | undefined
      const receipt = (await db
        .from('review_confirmed_processing_receipts')
        .select('state', 'last_external_error_code')
        .first()) as unknown as Partial<ReceiptEvidenceRow> | undefined
      throw new Error(
        `Review domain event unexpectedly retried with ${String(
          row?.['last_error_code']
        )}; receipt=${JSON.stringify(receipt ?? null)}`
      )
    }
    return result
  }

  async function createCompletedSession() {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const reviewer = await UserFactory.create({
      credibility_data: {
        credibility_score: 50,
        total_reviews_given: 0,
        accurate_reviews: 0,
        disputed_reviews: 0,
        last_calculated_at: null,
      },
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
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
      status: ReviewSessionStatus.COMPLETED,
      manager_review_completed: true,
      creator_reviewer_id: owner.id,
      creator_review_completed: true,
      manager_reviews_count: 1,
      peer_reviews_count: 1,
      required_peer_reviews: 1,
      required_total_reviews: 2,
      minimum_manager_reviews: 1,
      minimum_peer_reviews: 1,
    })
    const skill = await SkillFactory.create()
    await SkillReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: owner.id,
      skill_id: skill.id,
      reviewer_type: 'manager',
    })
    await SkillReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewer.id,
      skill_id: skill.id,
      reviewer_type: 'peer',
    })

    return { reviewee, reviewer, session, task, assignment, org }
  }

  async function seedNativeAccomplishmentClaim(input: {
    revieweeId: string
    reviewerId: string
    sessionId: string
    taskId: string
    assignmentId: string
    organizationId: string
  }) {
    const workflowId = randomUUID()
    const claimId = randomUUID()
    const evidenceId = randomUUID()
    const observationId = randomUUID()
    const observation: ReviewObservationV1 = {
      schemaVersion: 'suar.review_observation.v1',
      id: observationId,
      reviewWorkflowId: workflowId,
      reviewSessionId: input.sessionId,
      reviewRevision: 1,
      reviewPolicyVersion: 'review-policy-2026.08',
      capabilityTaxonomyVersion: 'capability-taxonomy-2026.08',
      assignmentSnapshotId: randomUUID(),
      sourceSnapshotHash: reviewHash('1'),
      taskAssignmentId: input.assignmentId,
      subjectUserId: input.revieweeId,
      observationType: 'accomplishment_claim',
      targetRef: claimId,
      disposition: 'confirm',
      structuredValue: { outcome: 'verified' },
      rationale: 'The reviewed completion claim satisfies the native review contract.',
      evidenceRefs: [evidenceId],
      reviewerId: input.reviewerId,
      reviewerType: 'human',
      confidence: 0.95,
      assessmentCeiling: 8,
      governanceState: 'final',
      supersedesObservationId: null,
      createdAt: '2026-08-08T08:00:00.000Z',
      finalizedAt: '2026-08-08T08:05:00.000Z',
    }
    const observationInput: CreateReviewObservationInput = {
      idempotencyKey: `review-confirmed-native:${randomUUID()}`,
      observation,
      reviewerRole: 'technical_reviewer',
      taskAssignmentHash: reviewHash('2'),
      assignmentSnapshotHash: reviewHash('3'),
      completionReportId: randomUUID(),
      completionReportHash: reviewHash('4'),
      completionClaimId: claimId,
      completionClaimHash: reviewHash('5'),
      sourceSnapshotId: randomUUID(),
      taskContractVersionId: randomUUID(),
      taskContractHash: reviewHash('6'),
      rationaleClassification: 'confidential',
      evidenceSufficiency: 'adequate',
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      disputeId: null,
      disputeFrozenAt: null,
      revisionPayload: { source: 'native-review-confirmation-fixture' },
      evidenceLinks: [
        {
          evidenceId,
          relation: 'supports',
          accessClassification: 'confidential',
          reviewerAccessState: 'available',
          evidenceHash: reviewHash('7'),
        },
      ],
    }

    await db.table('task_review_workflows').insert({
      id: workflowId,
      task_id: input.taskId,
      project_id: randomUUID(),
      organization_id: input.organizationId,
      task_assignment_id: input.assignmentId,
      reviewee_id: input.revieweeId,
      status: 'completed',
      required_review_count: 1,
      completed_review_count: 1,
      completed_at: new Date('2026-08-08T08:10:00.000Z'),
    })
    const persisted = await reviewObservations.createOrLoad(observationInput)

    return { workflowId, observationId: persisted.observationId, revisionId: persisted.revisionId }
  }

  test('confirmed review writes a confirmation entry and recalculates reviewer credibility', async ({
    assert,
  }) => {
    const { reviewee, reviewer, session } = await createCompletedSession()
    const command = makeConfirmReviewCommand(reviewee.id)
    const confirmationDependentCacheKeys = [
      `review:session:v4:sessionId:${session.id}`,
      `users:spider_chart:v4:${reviewee.id}`,
      `users:featured_reviews:v2:${reviewee.id}:3`,
      `users:delivery_metrics:${reviewee.id}`,
    ]
    await Promise.all(
      confirmationDependentCacheKeys.map((key) => RedisCacheStore.set(key, { stale: true }))
    )

    const confirmation = await command.handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )

    const updatedSession = await ReviewSession.findOrFail(session.id)
    const confirmations = updatedSession.confirmations ?? []
    const savedConfirmation = confirmations[0]
    const reviewerBeforeDelivery = await User.findOrFail(reviewer.id)
    const outboxRow = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .firstOrFail()) as ReviewConfirmedOutboxRow

    assert.equal(confirmation.action, 'confirmed')
    assert.equal(confirmation.user_id, reviewee.id)
    assert.equal(updatedSession.status, ReviewSessionStatus.COMPLETED)
    assert.equal(confirmations.length, 1)
    assert.equal(reviewerBeforeDelivery.credibility_data?.total_reviews_given, 0)
    assert.equal(outboxRow.status, 'pending')
    assert.equal(outboxRow.aggregate_type, 'review_session')
    assert.equal(outboxRow.payload['reviewSessionId'], session.id)
    assert.isNull(outboxRow.payload['accomplishmentProjection'])
    assert.deepEqual(await drainReviewDomainEvents(), {
      claimed: 1,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })

    const updatedReviewer = await User.findOrFail(reviewer.id)
    assert.isDefined(savedConfirmation)
    if (!savedConfirmation) {
      return
    }

    assert.equal(savedConfirmation.action, 'confirmed')
    assert.equal(updatedReviewer.credibility_data?.total_reviews_given, 1)
    assert.equal(updatedReviewer.credibility_data?.accurate_reviews, 1)
    assert.equal(updatedReviewer.credibility_data?.credibility_score, 90)
    const receipt = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', outboxRow.payload['confirmationId'])
      .firstOrFail()) as unknown as ReceiptEvidenceRow
    assert.equal(receipt.state, 'completed')
    assert.isNotNull(receipt.external_effects_saved_at)
    assert.equal(Number(receipt.external_effect_cursor), Number(receipt.external_effect_total))
    const talentReindex = (await db
      .from('domain_event_outbox')
      .where('event_name', 'search:talent-reindex-requested')
      .where('aggregate_id', reviewee.id)
      .firstOrFail()) as unknown as TalentReindexOutboxEvidence
    assert.equal(talentReindex.status, 'pending')
    assert.equal(talentReindex.aggregate_type, 'user_talent')
    assert.deepInclude(talentReindex.payload, {
      userId: reviewee.id,
      sourceEventName: 'reviews:talent-explainability-projection:changed:v1',
    })
    assert.match(talentReindex.payload['sourceEventId'], /^\d+$/)
    for (const key of confirmationDependentCacheKeys) {
      assert.isNull(await RedisCacheStore.get(key), `Expected confirmation to invalidate ${key}`)
    }
  })

  test('confirmed native review carries an unambiguous accomplishment projection identity', async ({
    assert,
  }) => {
    const { reviewee, reviewer, session, task, assignment, org } = await createCompletedSession()
    const fixture = await seedNativeAccomplishmentClaim({
      revieweeId: reviewee.id,
      reviewerId: reviewer.id,
      sessionId: session.id,
      taskId: task.id,
      assignmentId: assignment.id,
      organizationId: org.id,
    })

    try {
      await makeConfirmReviewCommand(reviewee.id).handle(
        new ConfirmReviewDTO({
          review_session_id: session.id,
          action: 'confirmed',
        })
      )

      const outboxRow = (await db
        .from('domain_event_outbox')
        .where('event_name', 'review:confirmed')
        .where('aggregate_id', session.id)
        .firstOrFail()) as ReviewConfirmedOutboxRow
      const projection = outboxRow.payload['accomplishmentProjection'] as {
        reviewWorkflowId: string
        completionClaimId: string
        reviewFinalizedFactId: string
        reviewFinalizedFactHash: string
        projectionPolicyVersion: string
      }

      assert.deepEqual(projection, {
        reviewWorkflowId: fixture.workflowId,
        completionClaimId: (
          await db
            .from('review_observation_revisions')
            .where('id', fixture.revisionId)
            .select('completion_claim_id')
            .firstOrFail()
        ).completion_claim_id,
        reviewFinalizedFactId: (
          await db
            .from('review_observation_revisions')
            .where('id', fixture.revisionId)
            .select('observation_fact_id')
            .firstOrFail()
        ).observation_fact_id,
        reviewFinalizedFactHash: (
          await db
            .from('review_observation_revisions')
            .where('id', fixture.revisionId)
            .select('revision_hash')
            .firstOrFail()
        ).revision_hash,
        projectionPolicyVersion: 'review-policy-2026.08',
      })
      assert.equal(fixture.observationId.length, 36)
    } finally {
      await db.from('review_observation_evidence_links').delete()
      await db.from('review_observation_revisions').delete()
      await db.from('review_observations').delete()
      await db.from('task_review_workflows').where('id', fixture.workflowId).delete()
    }
  })

  test('confirmed review verifies evidence linked to submitted skill ratings', async ({
    assert,
  }) => {
    const { reviewee, session } = await createCompletedSession()
    const linkedSkillReview = (await db
      .from('skill_reviews')
      .where('review_session_id', session.id)
      .where('review_status', 'submitted')
      .select('id')
      .firstOrFail()) as { id: string }
    const [linkedEvidence] = (await db
      .table('review_evidences')
      .insert({
        review_session_id: session.id,
        evidence_type: 'pull_request',
        url: 'https://example.test/linked-pr',
        title: 'Linked PR',
        uploaded_by: reviewee.id,
        verification_status: 'pending',
        is_sensitive: false,
      })
      .returning('id')) as Array<{ id: string }>
    const [unlinkedEvidence] = (await db
      .table('review_evidences')
      .insert({
        review_session_id: session.id,
        evidence_type: 'document_link',
        url: 'https://example.test/unlinked-doc',
        title: 'Unlinked doc',
        uploaded_by: reviewee.id,
        verification_status: 'pending',
        is_sensitive: false,
      })
      .returning('id')) as Array<{ id: string }>

    if (!linkedEvidence || !unlinkedEvidence) {
      throw new Error('Expected evidence fixtures to be created')
    }

    await db.table('skill_review_evidence_links').insert({
      skill_review_id: linkedSkillReview.id,
      review_evidence_id: linkedEvidence.id,
      relevance_type: 'direct_observation',
      reviewer_note: 'This PR supports the rating',
    })

    await makeConfirmReviewCommand(reviewee.id).handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )

    const rows = (await db
      .from('review_evidences')
      .whereIn('id', [linkedEvidence.id, unlinkedEvidence.id])
      .select('id', 'verification_status')) as Array<{
      id: string
      verification_status: string | null
    }>
    const statusById = new Map(rows.map((row) => [row.id, row.verification_status]))

    assert.equal(statusById.get(linkedEvidence.id), 'verified')
    assert.equal(statusById.get(unlinkedEvidence.id), 'pending')

    await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .delete()
  })

  test('opening a dispute does not penalize reviewer credibility before admin resolution', async ({
    assert,
  }) => {
    const { reviewee, reviewer, session } = await createCompletedSession()
    const command = makeConfirmReviewCommand(reviewee.id)

    await command.handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'disputed',
        dispute_reason: 'Đánh giá không chính xác',
      })
    )
    assert.deepEqual(await drainReviewDomainEvents(), {
      claimed: 1,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })

    const updatedSession = await ReviewSession.findOrFail(session.id)
    const updatedReviewer = await User.findOrFail(reviewer.id)
    const confirmations = updatedSession.confirmations ?? []
    const savedConfirmation = confirmations[0]

    assert.equal(updatedSession.status, ReviewSessionStatus.DISPUTED)
    assert.equal(confirmations.length, 1)
    assert.isDefined(savedConfirmation)
    if (!savedConfirmation) {
      return
    }

    assert.equal(savedConfirmation.action, 'disputed')
    assert.equal(savedConfirmation.dispute_reason, 'Đánh giá không chính xác')
    assert.equal(updatedReviewer.credibility_data?.total_reviews_given, 0)
    assert.equal(updatedReviewer.credibility_data?.disputed_reviews, 0)
    assert.equal(updatedReviewer.credibility_data?.credibility_score, 50)

    const disputes = (await db
      .from('review_disputes')
      .where('review_session_id', session.id)
      .select(
        'review_session_id',
        'reviewee_id',
        'opened_by',
        'status',
        'requested_outcome'
      )) as ReviewDisputeRow[]

    assert.lengthOf(disputes, 1)
    assert.equal(disputes[0]?.review_session_id, session.id)
    assert.equal(disputes[0]?.reviewee_id, reviewee.id)
    assert.equal(disputes[0]?.opened_by, reviewee.id)
    assert.equal(disputes[0]?.status, ReviewDisputeStatus.PENDING)
    assert.equal(disputes[0]?.requested_outcome, 'other')
  })

  test('same reviewee cannot confirm the same session twice', async ({ assert }) => {
    const { reviewee, session } = await createCompletedSession()
    const command = makeConfirmReviewCommand(reviewee.id)
    const dto = new ConfirmReviewDTO({
      review_session_id: session.id,
      action: 'confirmed',
    })

    await command.handle(dto)
    await assert.rejects(() => command.handle(dto))
    const outboxCounts = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .count('* as total')) as CountRow[]
    assert.equal(Number(outboxCounts[0]?.total ?? 0), 1)
  })

  test('reviewee cannot open a second active dispute through confirm flow', async ({ assert }) => {
    const { reviewee, session, task, assignment } = await createCompletedSession()
    await db.table('review_disputes').insert({
      review_session_id: session.id,
      task_assignment_id: assignment.id,
      task_id: task.id,
      reviewee_id: reviewee.id,
      opened_by: reviewee.id,
      status: ReviewDisputeStatus.PENDING,
      dispute_reason: 'Existing dispute',
      requested_outcome: 'other',
      disputed_dimensions: JSON.stringify({}),
      disputed_skill_reviews: JSON.stringify([]),
    })

    const command = makeConfirmReviewCommand(reviewee.id)

    await assert.rejects(() =>
      command.handle(
        new ConfirmReviewDTO({
          review_session_id: session.id,
          action: 'disputed',
          dispute_reason: 'Need another dispute',
        })
      )
    )

    const outboxCounts = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .count('* as total')) as CountRow[]
    assert.equal(Number(outboxCounts[0]?.total ?? 0), 0)
  })

  test('ACK loss retries external delivery without repeating database audits', async ({
    assert,
  }) => {
    const { reviewee, session } = await createCompletedSession()
    const command = makeConfirmReviewCommand(reviewee.id)
    await command.handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )

    const postgresRepository = new PostgresDomainEventOutboxRepository()
    let rejectFirstAcknowledgement = true
    const repository: DomainEventOutboxRepository = {
      stage: postgresRepository.stage.bind(postgresRepository),
      claimBatch: postgresRepository.claimBatch.bind(postgresRepository),
      heartbeat: postgresRepository.heartbeat.bind(postgresRepository),
      acknowledge: async (input) => {
        if (rejectFirstAcknowledgement) {
          rejectFirstAcknowledgement = false
          return false
        }
        return postgresRepository.acknowledge(input)
      },
      retry: postgresRepository.retry.bind(postgresRepository),
      deadLetter: postgresRepository.deadLetter.bind(postgresRepository),
    }
    let now = new Date('2030-07-26T12:00:00.000Z')
    const worker = new DomainEventOutboxWorker({
      workerId: `confirm-review-ack-loss:${randomUUID()}`,
      repository,
      dispatcher: new AdonisDomainEventDispatcher(),
      now: () => now,
      leaseDurationMs: 5_000,
      heartbeatIntervalMs: 1_000,
      handlerDeadlineMs: 4_000,
      concurrency: 1,
    })

    assert.deepEqual(await worker.runOnce(), {
      claimed: 1,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 1,
    })
    const auditsAfterFirstDelivery = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    now = new Date(now.getTime() + 5_001)
    await db
      .from('domain_event_outbox')
      .where('event_name', 'search:talent-reindex-requested')
      .delete()
    assert.deepEqual(await worker.runOnce(), {
      claimed: 1,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })
    const auditsAfterRetry = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    assert.equal(auditsAfterRetry, auditsAfterFirstDelivery)

    const receipt = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', `review-confirmed:${session.id}:${reviewee.id}`)
      .firstOrFail()) as unknown as ReceiptEvidenceRow
    assert.equal(receipt.state, 'completed')
  })

  test('completed review-confirmed replay is a no-op', async ({ assert }) => {
    const { reviewee, session } = await createCompletedSession()
    await makeConfirmReviewCommand(reviewee.id).handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )

    const outbox = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .firstOrFail()) as unknown as OutboxEvidenceRow
    const processor = new ProcessReviewConfirmedEventCommand(
      reviewExternalDependencies,
      reviewMetricsReader,
      {
        emitSkillScoreUpdated: () => Promise.resolve(),
        invalidateUserProfileReviewData: () => Promise.resolve(),
        publishTalentProjection: () => Promise.resolve(),
      },
      reviewTalentFactSources,
      reviewSessionReads,
      new LucidReviewTransactionRunner(),
      new LucidReviewConfirmedReceiptStore(),
      new LucidReviewProjectionLock()
    )

    await processor.handle(outbox.payload)
    const auditCountAfterFirstDelivery = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    const receiptAfterFirstDelivery = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', outbox.payload.confirmationId)
      .firstOrFail()) as unknown as ReceiptEvidenceRow

    await processor.handle(outbox.payload)

    const auditCountAfterReplay = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    const receiptAfterReplay = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', outbox.payload.confirmationId)
      .firstOrFail()) as unknown as ReceiptEvidenceRow

    assert.equal(receiptAfterFirstDelivery.state, 'completed')
    assert.equal(receiptAfterReplay.state, 'completed')
    assert.equal(auditCountAfterReplay, auditCountAfterFirstDelivery)
    assert.equal(
      Number(receiptAfterReplay.external_effect_cursor),
      Number(receiptAfterFirstDelivery.external_effect_cursor)
    )
  })

  test('dead-letters a forged review-confirmed envelope without applying projections', async ({
    assert,
  }) => {
    const { reviewee, reviewer, session } = await createCompletedSession()
    const command = makeConfirmReviewCommand(reviewee.id)
    await command.handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )

    const outbox = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .firstOrFail()) as unknown as OutboxEvidenceRow
    await db
      .from('domain_event_outbox')
      .where('id', outbox.id)
      .update({
        payload: {
          ...outbox.payload,
          reviewerIds: [randomUUID()],
        },
      })

    assert.deepEqual(
      await new DomainEventOutboxWorker({
        workerId: `confirm-review-forged-source:${randomUUID()}`,
        dispatcher: new AdonisDomainEventDispatcher(),
        concurrency: 1,
      }).runOnce(),
      {
        claimed: 1,
        processed: 0,
        retried: 0,
        deadLettered: 1,
        leaseLost: 0,
      }
    )

    const deadLetter = (await db
      .from('domain_event_outbox')
      .select('status', 'last_error_code')
      .where('id', outbox.id)
      .firstOrFail()) as unknown as DeadLetterEvidenceRow
    assert.equal(deadLetter.status, 'dead_letter')
    assert.equal(deadLetter.last_error_code, 'INVALID_DOMAIN_EVENT_ENVELOPE')
    assert.isNull(
      await db
        .from('review_confirmed_processing_receipts')
        .where('confirmation_id', `review-confirmed:${session.id}:${reviewee.id}`)
        .first()
    )

    const unchangedReviewer = await User.findOrFail(reviewer.id)
    assert.equal(unchangedReviewer.credibility_data?.total_reviews_given, 0)
  })

  test('external failure retries stable effects without repeating the database phase', async ({
    assert,
  }) => {
    const { reviewee, session } = await createCompletedSession()
    await makeConfirmReviewCommand(reviewee.id).handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )
    const outbox = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .firstOrFail()) as unknown as OutboxEvidenceRow

    let rejectProjection = true
    let skillDeliveries = 0
    let cacheInvalidations = 0
    const deliveredProjections: TalentExplainabilityProjectionChangedV1[] = []
    const externalEffects: ReviewExternalEffectPublisher = {
      emitSkillScoreUpdated: () => {
        skillDeliveries += 1
        return Promise.resolve()
      },
      invalidateUserProfileReviewData: () => {
        cacheInvalidations += 1
        return Promise.resolve()
      },
      publishTalentProjection: (event) => {
        deliveredProjections.push(event)
        if (rejectProjection) {
          return Promise.reject(new Error('temporary projection failure'))
        }
        return Promise.resolve()
      },
    }
    const processor = new ProcessReviewConfirmedEventCommand(
      reviewExternalDependencies,
      reviewMetricsReader,
      externalEffects,
      reviewTalentFactSources,
      reviewSessionReads,
      new LucidReviewTransactionRunner(),
      new LucidReviewConfirmedReceiptStore(),
      new LucidReviewProjectionLock()
    )

    const payload = outbox.payload
    await assert.rejects(() => processor.handle(payload))
    const auditsAfterFailure = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    const pendingReceipt = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', `review-confirmed:${session.id}:${reviewee.id}`)
      .firstOrFail()) as unknown as ReceiptEvidenceRow
    assert.equal(pendingReceipt.state, 'database_applied')
    assert.equal(Number(pendingReceipt.external_attempt_count), 1)
    assert.equal(pendingReceipt.last_external_error_code, 'REVIEW_CONFIRMED_EXTERNAL_EFFECT_FAILED')
    const skillDeliveriesAfterFailure = skillDeliveries
    const cacheInvalidationsAfterFailure = cacheInvalidations
    assert.isAbove(Number(pendingReceipt.external_effect_cursor), 0)
    assert.isBelow(
      Number(pendingReceipt.external_effect_cursor),
      Number(pendingReceipt.external_effect_total)
    )

    rejectProjection = false
    await processor.handle(payload)
    const auditsAfterRecovery = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    assert.equal(auditsAfterRecovery, auditsAfterFailure)
    assert.equal(skillDeliveries, skillDeliveriesAfterFailure)
    assert.equal(cacheInvalidations, cacheInvalidationsAfterFailure)
    assert.lengthOf(deliveredProjections, 2)
    assert.deepEqual(deliveredProjections[1], deliveredProjections[0])

    const completedReceipt = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', `review-confirmed:${session.id}:${reviewee.id}`)
      .firstOrFail()) as unknown as ReceiptEvidenceRow
    assert.equal(completedReceipt.state, 'completed')
    assert.equal(
      Number(completedReceipt.external_effect_cursor),
      Number(completedReceipt.external_effect_total)
    )
  })
})
