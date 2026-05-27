import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { loadReviewDisputeComments } from '#modules/reviews/actions/commands/review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { computeDisputeCaseFileCompleteness } from '#modules/reviews/domain/review_dispute_rules'

export interface BuildReviewDisputeCaseFileDTO {
  dispute_id: string
}

export interface ReviewDisputeCaseFileResult {
  id: string
  dispute_id: string
  case_version: number
  created_at: string
  created_by: string | null
  task_snapshot: Record<string, unknown>
  required_skills_snapshot: Record<string, unknown>[]
  acceptance_criteria_snapshot: Record<string, unknown>
  assignment_snapshot: Record<string, unknown>
  submission_snapshot: Record<string, unknown>
  review_snapshot: Record<string, unknown>
  skill_reviews_snapshot: Record<string, unknown>[]
  evidences_snapshot: Record<string, unknown>[]
  self_assessment_snapshot: Record<string, unknown>
  task_comments_snapshot: Record<string, unknown>[]
  task_history_snapshot: Record<string, unknown>[]
  reviewee_profile_context_snapshot: Record<string, unknown>
  reviewer_context_snapshot: Record<string, unknown>
  dispute_claim_snapshot: Record<string, unknown>
  completeness_score: number
  missing_data: string[]
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>
  return (value ?? {}) as Record<string, unknown>
}

function parseJsonArray(value: unknown): Record<string, unknown>[] {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>[]
  return (value ?? []) as Record<string, unknown>[]
}

function normalize(row: Record<string, unknown>): ReviewDisputeCaseFileResult {
  return {
    id: row.id as string,
    dispute_id: row.dispute_id as string,
    case_version: Number(row.case_version),
    created_at: toIsoLike(row.created_at),
    created_by: (row.created_by as string | null) ?? null,
    task_snapshot: parseJsonObject(row.task_snapshot),
    required_skills_snapshot: parseJsonArray(row.required_skills_snapshot),
    acceptance_criteria_snapshot: parseJsonObject(row.acceptance_criteria_snapshot),
    assignment_snapshot: parseJsonObject(row.assignment_snapshot),
    submission_snapshot: parseJsonObject(row.submission_snapshot),
    review_snapshot: parseJsonObject(row.review_snapshot),
    skill_reviews_snapshot: parseJsonArray(row.skill_reviews_snapshot),
    evidences_snapshot: parseJsonArray(row.evidences_snapshot),
    self_assessment_snapshot: parseJsonObject(row.self_assessment_snapshot),
    task_comments_snapshot: parseJsonArray(row.task_comments_snapshot),
    task_history_snapshot: parseJsonArray(row.task_history_snapshot),
    reviewee_profile_context_snapshot: parseJsonObject(row.reviewee_profile_context_snapshot),
    reviewer_context_snapshot: parseJsonObject(row.reviewer_context_snapshot),
    dispute_claim_snapshot: parseJsonObject(row.dispute_claim_snapshot),
    completeness_score: Number(row.completeness_score),
    missing_data: parseJsonArray(row.missing_data).map((item) => {
      const key = item.key
      return typeof key === 'string' ? key : ''
    }),
  }
}

function toIsoLike(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date(0).toISOString()
}

export default class BuildReviewDisputeCaseFileCommand {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: BuildReviewDisputeCaseFileDTO): Promise<ReviewDisputeCaseFileResult> {
    const actorId = requireUserId(this.execCtx)
    const trx = await db.transaction()

    try {
      const dispute = (await trx.from('review_disputes').where('id', dto.dispute_id).first()) as
        | {
            id: string
            task_id: string
            task_assignment_id: string
            review_session_id: string
            reviewee_id: string
            dispute_reason: string
            requested_outcome: string
          }
        | undefined
      if (!dispute) {
        throw new NotFoundException('Review dispute not found')
      }

      const [
        task,
        assignment,
        review,
        requiredSkills,
        skillReviews,
        submission,
        taskComments,
        disputeComments,
        taskHistory,
      ] =
        (await Promise.all([
          trx.from('tasks').where('id', dispute.task_id).first(),
          trx.from('task_assignments').where('id', dispute.task_assignment_id).first(),
          trx.from('review_sessions').where('id', dispute.review_session_id).first(),
          trx.from('task_required_skills').where('task_id', dispute.task_id).select('*'),
          trx.from('skill_reviews').where('review_session_id', dispute.review_session_id).select('*'),
          trx.from('task_submissions').where('task_id', dispute.task_id).first(),
          trx
            .from('task_comments')
            .where('task_id', dispute.task_id)
            .whereNull('deleted_at')
            .select('*'),
          loadReviewDisputeComments(trx, dto.dispute_id),
          trx.from('task_versions').where('task_id', dispute.task_id).orderBy('changed_at', 'asc'),
        ])) as [
          (Record<string, unknown> & { acceptance_criteria?: string; verification_method?: string }) | undefined,
          Record<string, unknown> | undefined,
          Record<string, unknown> | undefined,
          Record<string, unknown>[],
          Record<string, unknown>[],
          (Record<string, unknown> & { id: string }) | undefined,
          Record<string, unknown>[],
          Record<string, unknown>[],
          Record<string, unknown>[]
        ]

      const evidences = submission
        ? ((await trx
            .from('task_submission_evidences')
            .where('submission_id', submission.id)
            .select('*')) as Record<string, unknown>[])
        : []

      const latest = (await trx
        .from('review_dispute_case_files')
        .where('dispute_id', dto.dispute_id)
        .max('case_version as latest_version')
        .first()) as { latest_version: number | null } | undefined
      const nextVersion = (latest?.latest_version ?? 0) + 1
      const { completenessScore, missingData } = computeDisputeCaseFileCompleteness({
        task,
        assignment,
        review,
        submission,
        requiredSkills,
        skillReviews,
      })

      const [created] = (await trx
        .table('review_dispute_case_files')
        .insert({
          dispute_id: dto.dispute_id,
          case_version: nextVersion,
          task_snapshot: JSON.stringify(task ?? {}),
          required_skills_snapshot: JSON.stringify(requiredSkills),
          acceptance_criteria_snapshot: JSON.stringify({
            acceptance_criteria: task?.acceptance_criteria ?? null,
            verification_method: task?.verification_method ?? null,
          }),
          assignment_snapshot: JSON.stringify(assignment ?? {}),
          submission_snapshot: JSON.stringify(submission ?? {}),
          review_snapshot: JSON.stringify(review ?? {}),
          skill_reviews_snapshot: JSON.stringify(skillReviews),
          evidences_snapshot: JSON.stringify(evidences),
          self_assessment_snapshot: JSON.stringify({}),
          task_comments_snapshot: JSON.stringify(taskComments),
          task_history_snapshot: JSON.stringify(taskHistory),
          reviewee_profile_context_snapshot: JSON.stringify({ reviewee_id: dispute.reviewee_id }),
          reviewer_context_snapshot: JSON.stringify({}),
          dispute_claim_snapshot: JSON.stringify({
            dispute_id: dispute.id,
            dispute_reason: dispute.dispute_reason,
            requested_outcome: dispute.requested_outcome,
            dispute_comments: disputeComments,
          }),
          completeness_score: completenessScore,
          missing_data: JSON.stringify(missingData.map((key) => ({ key }))),
          created_by: actorId,
        })
        .returning('*')) as [Record<string, unknown>]

      await trx.commit()
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'build_review_dispute_case_file',
          entity_type: 'review_dispute',
          entity_id: dto.dispute_id,
          old_values: null,
          new_values: {
            case_file_id: created.id,
            case_version: nextVersion,
            completeness_score: completenessScore,
          },
        })
      }
      return normalize(created)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
