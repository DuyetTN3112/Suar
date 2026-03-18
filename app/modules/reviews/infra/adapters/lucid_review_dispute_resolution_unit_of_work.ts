import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  stageDomainEvent,
  type DisputeResolvedOutboxPayload,
} from '#modules/events/public_contracts/domain_event_outbox'
import type {
  ReviewDisputeResolutionPersistenceSession,
  ReviewDisputeResolutionUnitOfWork,
  ReviewDisputeResolutionWrite,
} from '#modules/reviews/actions/ports/outbound/review_dispute_resolution_unit_of_work'

export default class LucidReviewDisputeResolutionUnitOfWork implements ReviewDisputeResolutionUnitOfWork {
  run<T>(work: (session: ReviewDisputeResolutionPersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction(async (transaction) => {
      const resolve = async (
        table:
          | 'review_disputes'
          | 'sprint_review_disputes'
          | 'sprint_reverse_review_workflows'
          | 'task_review_workflows',
        input: ReviewDisputeResolutionWrite,
        includeTypedActions: boolean
      ): Promise<Record<string, unknown>> => {
        const [resolved] = (await transaction
          .from(table)
          .where('id', input.disputeId)
          .update({
            status: 'resolved',
            resolved_at: db.raw('NOW()'),
            resolved_by: input.actorId,
            final_decision: input.finalDecision,
            final_rationale: input.finalRationale.trim(),
            ...(includeTypedActions
              ? {
                  profile_update_action: input.profileUpdateAction ?? null,
                  reviewer_credibility_action: input.reviewerCredibilityAction ?? null,
                }
              : {}),
            updated_at: db.raw('NOW()'),
          })
          .returning('*')) as Record<string, unknown>[]
        if (!resolved) {
          throw new InvariantViolationException(
            `Review dispute resolution update returned no row for ${table}`,
            {
              details: {
                table,
                dispute_id: input.disputeId,
              },
            }
          )
        }
        return resolved
      }

      const session: ReviewDisputeResolutionPersistenceSession = {
        findActorSystemRole: async (actorId) => {
          const actor = (await transaction
            .from('users')
            .where('id', actorId)
            .select('system_role')
            .first()) as { system_role?: string | null } | undefined
          return actor ? (actor.system_role ?? null) : undefined
        },
        loadClassicDisputeForUpdate: async (disputeId) => {
          const dispute = (await transaction
            .from('review_disputes')
            .where('id', disputeId)
            .forUpdate()
            .select('status', 'review_session_id')
            .first()) as
            | {
                status: string
                review_session_id: string
              }
            | undefined
          return dispute
            ? {
                status: dispute.status,
                reviewSessionId: dispute.review_session_id,
              }
            : null
        },
        loadSprintDisputeForUpdate: async (disputeId) => {
          const dispute = (await transaction
            .from('sprint_review_disputes')
            .where('id', disputeId)
            .forUpdate()
            .select('id', 'status', 'dispute_review_type')
            .first()) as
            | {
                id: string
                status: string
                dispute_review_type: string | null
              }
            | undefined
          return dispute
            ? {
                id: dispute.id,
                status: dispute.status,
                disputeReviewType: dispute.dispute_review_type,
              }
            : null
        },
        loadSprintReverseWorkflowForUpdate: async (disputeId) => {
          const workflow = (await transaction
            .from('sprint_reverse_review_workflows')
            .where('id', disputeId)
            .forUpdate()
            .select('id', 'status', 'target_type', 'reviewer_id')
            .first()) as
            | {
                id: string
                status: string
                target_type: string
                reviewer_id: string
              }
            | undefined
          return workflow
            ? {
                id: workflow.id,
                status: workflow.status,
                targetType: workflow.target_type,
                reviewerId: workflow.reviewer_id,
              }
            : null
        },
        loadTaskWorkflowForUpdate: async (disputeId) => {
          const workflow = (await transaction
            .from('task_review_workflows')
            .where('id', disputeId)
            .forUpdate()
            .select('id', 'status', 'reviewee_id')
            .first()) as
            | {
                id: string
                status: string
                reviewee_id: string | null
              }
            | undefined
          return workflow
            ? {
                id: workflow.id,
                status: workflow.status,
                revieweeId: workflow.reviewee_id,
              }
            : null
        },
        loadLatestDossier: async (disputeId) => {
          const row = (await transaction
            .from('review_dispute_case_files')
            .where('dispute_id', disputeId)
            .orderBy('case_version', 'desc')
            .select(
              'task_snapshot',
              'assignment_snapshot',
              'submission_snapshot',
              'review_snapshot',
              'skill_reviews_snapshot',
              'dispute_claim_snapshot',
              'task_comments_snapshot',
              'evidences_snapshot',
              'self_assessment_snapshot',
              'task_history_snapshot',
              'reviewer_context_snapshot',
              'reviewee_profile_context_snapshot'
            )
            .first()) as Record<string, unknown> | undefined
          return row
            ? {
                taskSnapshot: row['task_snapshot'],
                assignmentSnapshot: row['assignment_snapshot'],
                submissionSnapshot: row['submission_snapshot'],
                reviewSnapshot: row['review_snapshot'],
                skillReviewsSnapshot: row['skill_reviews_snapshot'],
                disputeClaimSnapshot: row['dispute_claim_snapshot'],
                taskCommentsSnapshot: row['task_comments_snapshot'],
                evidencesSnapshot: row['evidences_snapshot'],
                selfAssessmentSnapshot: row['self_assessment_snapshot'],
                taskHistorySnapshot: row['task_history_snapshot'],
                reviewerContextSnapshot: row['reviewer_context_snapshot'],
                revieweeProfileContextSnapshot: row['reviewee_profile_context_snapshot'],
              }
            : null
        },
        resolveClassicDispute: (input) => resolve('review_disputes', input, true),
        resolveSprintDispute: (input) => resolve('sprint_review_disputes', input, false),
        resolveSprintReverseWorkflow: (input) =>
          resolve('sprint_reverse_review_workflows', input, false),
        resolveTaskWorkflow: (input) => resolve('task_review_workflows', input, false),
        listReviewerIds: async (reviewSessionId) => {
          const rows = (await transaction
            .from('skill_reviews')
            .where('review_session_id', reviewSessionId)
            .select('reviewer_id')) as Array<{ reviewer_id: string }>
          return Array.from(new Set(rows.map((row) => row.reviewer_id))).sort()
        },
        stageResolvedEvent: async (input) => {
          const payload: DisputeResolvedOutboxPayload = {
            disputeId: input.disputeId,
            reviewSessionId: input.reviewSessionId,
            revieweeId: input.revieweeId,
            reviewerIds: input.reviewerIds,
            resolvedBy: input.resolvedBy,
            finalDecision: input.finalDecision,
            ...(input.profileUpdateAction !== undefined
              ? {
                  profileUpdateAction:
                    input.profileUpdateAction as DisputeResolvedOutboxPayload['profileUpdateAction'],
                }
              : {}),
            ...(input.reviewerCredibilityAction !== undefined
              ? {
                  reviewerCredibilityAction:
                    input.reviewerCredibilityAction as DisputeResolvedOutboxPayload['reviewerCredibilityAction'],
                }
              : {}),
          }
          await stageDomainEvent(transaction, {
            eventName: 'dispute:resolved',
            dedupeKey: `dispute-resolved:${input.disputeId}`,
            aggregateType: 'review_dispute',
            aggregateId: input.disputeId,
            payload,
          })
        },
        writeAudit: async (execCtx, input) => {
          await auditPublicApi.write(
            execCtx,
            {
              user_id: input.actorId,
              action: 'resolve_review_dispute',
              critical: true,
              entity_type: input.entityType,
              entity_id: input.entityId,
              old_values: null,
              new_values: {
                final_decision: input.finalDecision,
                profile_update_action: input.profileUpdateAction,
                reviewer_credibility_action: input.reviewerCredibilityAction,
              },
            },
            transaction
          )
        },
      }

      return work(session)
    })
  }
}
