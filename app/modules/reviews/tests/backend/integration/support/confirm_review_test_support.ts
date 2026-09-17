import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

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
import { AdonisDomainEventDispatcher } from '#modules/events/infra/adapters/domain-event-outbox-administration/adonis_domain_event_dispatcher'
import { DomainEventOutboxWorker } from '#modules/events/infra/adapters/domain-event-outbox-administration/domain_event_outbox_worker'
import { PostgresDomainEventOutboxRepository } from '#modules/events/infra/repositories/domain-event-outbox-administration/postgres_domain_event_outbox_repository'
import ConfirmReviewCommand from '#modules/reviews/actions/commands/review-submission/confirm_review_command'
import ProcessReviewConfirmedEventCommand from '#modules/reviews/actions/commands/review-submission/process_review_confirmed_event_command'
import { ConfirmReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewExternalEffectPublisher } from '#modules/reviews/actions/ports/outbound/review_external_effects'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import LucidReviewConfirmationDisputeUnitOfWork from '#modules/disputes/infra/adapters/lucid_review_confirmation_dispute_unit_of_work'
import {
  LucidReviewConfirmedReceiptStore,
  LucidReviewProjectionLock,
} from '#modules/reviews/infra/adapters/review-core/lucid_review_event_processing'
import { LucidReviewTransactionRunner } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'
import ReviewSession from '#modules/reviews/infra/models/review-session/review_session'
import {
  ReviewObservationRepository,
  type CreateReviewObservationInput,
} from '#modules/reviews/infra/repositories/observation/review_observation_repository'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import {
  ReviewDisputeStatus,
  ReviewSessionStatus,
} from '#modules/reviews/public_contracts/review_constants'
import type { TalentExplainabilityProjectionChangedV1 } from '#modules/reviews/public_contracts/talent_explainability_projection_v1'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import User from '#modules/users/infra/models/profile/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

export interface ReviewDisputeRow {
  review_session_id: string
  reviewee_id: string
  opened_by: string
  status: ReviewDisputeStatus
  requested_outcome: string
}

export const confirmationDisputes = new LucidReviewConfirmationDisputeUnitOfWork()
export const reviewObservations = new ReviewObservationRepository()

export function reviewHash(character: string): TvaSha256 {
  return `sha256:${character.repeat(64)}`
}

export function makeConfirmReviewCommand(userId: string): ConfirmReviewCommand {
  return new ConfirmReviewCommand(makeSystemReviewActionContext(userId), confirmationDisputes)
}

export interface ReviewConfirmedOutboxRow {
  event_name: string
  status: string
  aggregate_type: string
  aggregate_id: string
  payload: Record<string, unknown> & {
    confirmationId: string
    reviewSessionId: string
  }
}

export interface CountRow {
  total: string | number
}

export interface OutboxEvidenceRow {
  id: string
  payload: ReviewConfirmedOutboxPayload
}

export interface OutboxErrorRow {
  last_error_code: string | null
}

export interface DeadLetterEvidenceRow {
  status: string
  last_error_code: string | null
}

export interface ReceiptEvidenceRow {
  state: string
  external_effects_saved_at: Date | null
  external_effect_cursor: string | number
  external_effect_total: string | number | null
  external_attempt_count: string | number
  last_external_error_code: string | null
}

export interface TalentReindexOutboxEvidence {
  status: string
  aggregate_type: string
  payload: {
    userId: string
    sourceEventName: string
    sourceEventId: string
  }
}

export const PIPELINE_AUDIT_ACTIONS = [
  'recalculate_user_skill_score',
  'calculate_performance_score',
  'calculate_trust_score',
  'build_user_work_history',
  'upsert_user_performance_stats',
  'upsert_user_domain_expertise',
  'refresh_user_profile_aggregates',
] as const

export async function drainReviewDomainEvents() {
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

export async function createCompletedSession() {
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

export async function seedNativeAccomplishmentClaim(input: {
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

export function configureConfirmReviewTestGroup(group: {
  setup: (fn: () => Promise<void>) => void
  teardown: (fn: () => Promise<void>) => void
  each: {
    setup: (fn: (t: { timeout: (ms: number) => void }) => void) => void
    teardown: (fn: () => Promise<void>) => void
  }
}) {
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
}

export {
  AdonisDomainEventDispatcher,
  cleanupTestData,
  ConfirmReviewCommand,
  ConfirmReviewDTO,
  db,
  DomainEventOutboxRepository,
  DomainEventOutboxWorker,
  LucidReviewConfirmationDisputeUnitOfWork,
  LucidReviewConfirmedReceiptStore,
  LucidReviewProjectionLock,
  LucidReviewTransactionRunner,
  PostgresDomainEventOutboxRepository,
  ProcessReviewConfirmedEventCommand,
  randomUUID,
  RedisCacheStore,
  ReviewDisputeStatus,
  ReviewExternalEffectPublisher,
  reviewExternalDependencies,
  reviewMetricsReader,
  ReviewSession,
  reviewSessionReads,
  ReviewSessionStatus,
  reviewTalentFactSources,
  setupApp,
  TalentExplainabilityProjectionChangedV1,
  teardownApp,
  User,
}
