import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { buildReviewDisputeCaseFileRecord } from '#modules/reviews/actions/support/review_dispute_case_file_builder'

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
    id: row['id'] as string,
    dispute_id: row['dispute_id'] as string,
    case_version: Number(row['case_version']),
    created_at: toIsoLike(row['created_at']),
    created_by: (row['created_by'] as string | null) ?? null,
    task_snapshot: parseJsonObject(row['task_snapshot']),
    required_skills_snapshot: parseJsonArray(row['required_skills_snapshot']),
    acceptance_criteria_snapshot: parseJsonObject(row['acceptance_criteria_snapshot']),
    assignment_snapshot: parseJsonObject(row['assignment_snapshot']),
    submission_snapshot: parseJsonObject(row['submission_snapshot']),
    review_snapshot: parseJsonObject(row['review_snapshot']),
    skill_reviews_snapshot: parseJsonArray(row['skill_reviews_snapshot']),
    evidences_snapshot: parseJsonArray(row['evidences_snapshot']),
    self_assessment_snapshot: parseJsonObject(row['self_assessment_snapshot']),
    task_comments_snapshot: parseJsonArray(row['task_comments_snapshot']),
    task_history_snapshot: parseJsonArray(row['task_history_snapshot']),
    reviewee_profile_context_snapshot: parseJsonObject(row['reviewee_profile_context_snapshot']),
    reviewer_context_snapshot: parseJsonObject(row['reviewer_context_snapshot']),
    dispute_claim_snapshot: parseJsonObject(row['dispute_claim_snapshot']),
    completeness_score: Number(row['completeness_score']),
    missing_data: parseJsonArray(row['missing_data']).map((item) => {
      const key = item['key']
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
      const built = await buildReviewDisputeCaseFileRecord(trx, dto.dispute_id, actorId)

      await trx.commit()
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'build_review_dispute_case_file',
          entity_type: 'review_dispute',
          entity_id: dto.dispute_id,
          old_values: null,
          new_values: {
            case_file_id: built.id,
            case_version: built.caseVersion,
            completeness_score: built.completenessScore,
          },
        })
      }
      return normalize(built.row)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
