import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import type {
  ReviewSubmissionPersistenceSession,
  ReviewSubmissionSessionStatus,
  ReviewSubmissionSessionSnapshot,
  ReviewSubmissionUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_submission_unit_of_work'
import { loadReviewSessionActorAccessContext } from '#modules/reviews/infra/adapters/lucid_review_session_actor_access_reader'
import { markReviewerAssignmentSubmitted } from '#modules/reviews/infra/adapters/lucid_review_session_reviewer_assignment_writer'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'

interface ReviewSubmissionSessionRow {
  id: string
  task_assignment_id: string
  reviewee_id: string
  status: ReviewSubmissionSessionStatus
  manager_review_completed: boolean
  creator_reviewer_id: string | null
  creator_review_completed: boolean
  manager_reviews_count: number | string
  peer_reviews_count: number | string
  required_peer_reviews: number | string
  required_total_reviews: number | string
  minimum_manager_reviews: number | string
  minimum_peer_reviews: number | string
  overall_quality_score: number | string | null
  delivery_timeliness: string | null
  requirement_adherence: number | string | null
  communication_quality: number | string | null
  code_quality_score: number | string | null
  proactiveness_score: number | string | null
  would_work_with_again: boolean | null
  strengths_observed: string | null
  areas_for_improvement: string | null
  completed_at: Date | string | null
}

function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value)
}

function nullableDate(value: Date | string | null): Date | null {
  return value === null ? null : value instanceof Date ? value : new Date(value)
}

function toSessionSnapshot(
  row: ReviewSubmissionSessionRow
): ReviewSubmissionSessionSnapshot {
  return {
    id: row.id,
    taskAssignmentId: row.task_assignment_id,
    revieweeId: row.reviewee_id,
    status: row.status,
    managerReviewCompleted: row.manager_review_completed,
    creatorReviewerId: row.creator_reviewer_id,
    creatorReviewCompleted: row.creator_review_completed,
    managerReviewsCount: Number(row.manager_reviews_count),
    peerReviewsCount: Number(row.peer_reviews_count),
    requiredPeerReviews: Number(row.required_peer_reviews),
    requiredTotalReviews: Number(row.required_total_reviews),
    minimumManagerReviews: Number(row.minimum_manager_reviews),
    minimumPeerReviews: Number(row.minimum_peer_reviews),
    overallQualityScore: nullableNumber(row.overall_quality_score),
    deliveryTimeliness: row.delivery_timeliness,
    requirementAdherence: nullableNumber(row.requirement_adherence),
    communicationQuality: nullableNumber(row.communication_quality),
    codeQualityScore: nullableNumber(row.code_quality_score),
    proactivenessScore: nullableNumber(row.proactiveness_score),
    wouldWorkWithAgain: row.would_work_with_again,
    strengthsObserved: row.strengths_observed,
    areasForImprovement: row.areas_for_improvement,
    completedAt: nullableDate(row.completed_at),
  }
}

export default class LucidReviewSubmissionUnitOfWork
  implements ReviewSubmissionUnitOfWork
{
  run<T>(work: (session: ReviewSubmissionPersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction(async (transaction) => {
      const session: ReviewSubmissionPersistenceSession = {
        transaction,
        loadSessionForUpdate: async (reviewSessionId) => {
          const row = (await transaction
            .from('review_sessions')
            .where('id', reviewSessionId)
            .forUpdate()
            .select(
              'id',
              'task_assignment_id',
              'reviewee_id',
              'status',
              'manager_review_completed',
              'creator_reviewer_id',
              'creator_review_completed',
              'manager_reviews_count',
              'peer_reviews_count',
              'required_peer_reviews',
              'required_total_reviews',
              'minimum_manager_reviews',
              'minimum_peer_reviews',
              'overall_quality_score',
              'delivery_timeliness',
              'requirement_adherence',
              'communication_quality',
              'code_quality_score',
              'proactiveness_score',
              'would_work_with_again',
              'strengths_observed',
              'areas_for_improvement',
              'completed_at'
            )
            .first()) as ReviewSubmissionSessionRow | undefined
          return row ? toSessionSnapshot(row) : null
        },
        loadActorAccess: async (reviewSessionId, actorId) => {
          const access = await loadReviewSessionActorAccessContext(
            reviewSessionId,
            actorId,
            transaction
          )
          return access
            ? {
                sessionRevieweeId: access.sessionRevieweeId,
                managerReviewerIds: access.managerReviewerIds,
                peerReviewerIds: access.peerReviewerIds,
                isOrgAdminOrOwner: access.isOrgAdminOrOwner,
              }
            : null
        },
        markReviewerAssignmentSubmitted: (input) =>
          markReviewerAssignmentSubmitted(
            {
              ...input,
              submittedAt: DateTime.fromJSDate(input.submittedAt).toUTC(),
            },
            transaction
          ),
        hasSubmittedReview: async (reviewSessionId, reviewerId) => {
          const review = await SkillReviewRepository.findBySessionAndReviewer(
            reviewSessionId,
            reviewerId,
            transaction
          )
          return review !== null
        },
        listOwnedEvidenceIds: async (reviewSessionId, evidenceIds) => {
          if (evidenceIds.length === 0) {
            return []
          }
          const rows = (await transaction
            .from('review_evidences')
            .where('review_session_id', reviewSessionId)
            .whereIn('id', evidenceIds)
            .select('id')) as Array<{ id: string }>
          return rows.map((row) => row.id)
        },
        createSkillReviews: async (rows) => {
          const reviews = await SkillReviewRepository.createMany(
            rows.map((row) => ({
              review_session_id: row.reviewSessionId,
              reviewer_id: row.reviewerId,
              reviewer_type: row.reviewerType,
              skill_id: row.skillId,
              assigned_public_proficiency_code: row.assignedPublicProficiencyCode,
              proficiency_level_id: row.proficiencyLevelId,
              observed_level_id: row.observedLevelId,
              rubric_version_id: row.rubricVersionId,
              confidence: row.confidence,
              rationale: row.rationale,
              observable_behaviors: row.observableBehaviors,
              review_status: row.reviewStatus,
              submitted_at: DateTime.fromJSDate(row.submittedAt).toUTC(),
              comment: row.comment,
            })),
            transaction
          )
          return reviews.map((review) => ({
            id: review.id,
            review_session_id: review.review_session_id,
            reviewer_id: review.reviewer_id,
            reviewer_type: review.reviewer_type,
            skill_id: review.skill_id,
            assigned_public_proficiency_code: review.assigned_public_proficiency_code,
            comment: review.comment,
          }))
        },
        linkEvidence: async (rows) => {
          if (rows.length === 0) {
            return
          }
          await transaction.table('skill_review_evidence_links').insert(
            rows.map((row) => ({
              skill_review_id: row.skillReviewId,
              review_evidence_id: row.reviewEvidenceId,
              relevance_type: row.relevanceType,
              reviewer_note: row.reviewerNote,
            }))
          )
        },
        saveSessionState: async (input) => {
          await transaction.from('review_sessions').where('id', input.reviewSessionId).update({
            status: input.status,
            manager_review_completed: input.managerReviewCompleted,
            creator_review_completed: input.creatorReviewCompleted,
            manager_reviews_count: input.managerReviewsCount,
            peer_reviews_count: input.peerReviewsCount,
            overall_quality_score: input.overallQualityScore,
            delivery_timeliness: input.deliveryTimeliness,
            requirement_adherence: input.requirementAdherence,
            communication_quality: input.communicationQuality,
            code_quality_score: input.codeQualityScore,
            proactiveness_score: input.proactivenessScore,
            would_work_with_again: input.wouldWorkWithAgain,
            strengths_observed: input.strengthsObserved,
            areas_for_improvement: input.areasForImprovement,
            completed_at: input.completedAt,
            updated_at: new Date(),
          })
        },
        loadTaskIdForAssignment: async (taskAssignmentId) => {
          const assignment = (await transaction
            .from('task_assignments')
            .where('id', taskAssignmentId)
            .select('task_id')
            .first()) as { task_id: string } | undefined
          return assignment?.task_id ?? null
        },
        writeAudit: async (execCtx, input) => {
          await auditPublicApi.write(
            execCtx,
            {
              user_id: input.userId,
              action: 'submit_review',
              critical: true,
              entity_type: 'review_session',
              entity_id: input.reviewSessionId,
              old_values: null,
              new_values: {
                reviewer_id: input.userId,
                reviewer_type: input.reviewerType,
                skills_reviewed: input.skillsReviewed,
              },
            },
            transaction
          )
        },
        stageReviewSubmittedEvent: async (input) => {
          await stageDomainEvent(transaction, {
            eventName: 'review:submitted',
            dedupeKey: `review-submitted:v1:${input.reviewerAssignmentId}`,
            aggregateType: 'review_session',
            aggregateId: input.reviewSessionId,
            payload: input,
          })
        },
      }

      return work(session)
    })
  }
}
