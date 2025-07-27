import { BaseQuery } from '#actions/admin/base_query'
import { reviewPublicApi } from '#actions/reviews/public_api'
import { AdminFlaggedReviewReadOps } from '#infra/admin/repositories/read/admin_flagged_review_queries'
import type { ExecutionContext } from '#types/execution_context'

export interface GetFlaggedReviewDetailDTO {
  id: string
}

export interface GetFlaggedReviewDetailResult {
  review: {
    id: string
    flag_type: string
    severity: string
    status: string
    notes: string | null
    detected_at: string | null
    reviewed_at: string | null
    reviewer: { id: string; username: string; email: string | null } | null
    reviewee: { id: string; username: string; email: string | null } | null
    moderator: { id: string; username: string; email: string | null } | null
    task: { id: string; title: string | null } | null
    skill: { id: string; name: string | null } | null
    comment: string | null
  }
  evidences: {
    id: string
    title: string | null
    url: string | null
    evidence_type: string
    description: string | null
    created_at: string | null
  }[]
}

export default class GetFlaggedReviewDetailQuery extends BaseQuery<
  GetFlaggedReviewDetailDTO,
  GetFlaggedReviewDetailResult
> {
  constructor(
    execCtx: ExecutionContext,
    private flaggedReviewRepo = AdminFlaggedReviewReadOps
  ) {
    super(execCtx)
  }

  async handle(dto: GetFlaggedReviewDetailDTO): Promise<GetFlaggedReviewDetailResult> {
    const flaggedReview = await this.flaggedReviewRepo.getFlaggedReviewDetail(dto.id)
    if (!flaggedReview) {
      throw new Error(`Flagged review not found: ${dto.id}`)
    }

    const reviewSessionId = flaggedReview.skill_review.review_session_id
    const evidences = await reviewPublicApi.listEvidencesBySession(reviewSessionId)

    return {
      review: {
        id: flaggedReview.id,
        flag_type: flaggedReview.flag_type,
        severity: flaggedReview.severity,
        status: flaggedReview.status,
        notes: flaggedReview.notes,
        detected_at: flaggedReview.detected_at.toISO(),
        reviewed_at: flaggedReview.reviewed_at ? flaggedReview.reviewed_at.toISO() : null,
        reviewer: {
          id: flaggedReview.skill_review.reviewer.id,
          username: flaggedReview.skill_review.reviewer.username,
          email: flaggedReview.skill_review.reviewer.email,
        },
        reviewee: {
          id: flaggedReview.skill_review.review_session.reviewee.id,
          username: flaggedReview.skill_review.review_session.reviewee.username,
          email: flaggedReview.skill_review.review_session.reviewee.email,
        },
        moderator: flaggedReview.reviewed_by
          ? {
              id: flaggedReview.reviewer.id,
              username: flaggedReview.reviewer.username,
              email: flaggedReview.reviewer.email,
            }
          : null,
        task: {
          id: flaggedReview.skill_review.review_session.task_assignment.task.id,
          title: flaggedReview.skill_review.review_session.task_assignment.task.title,
        },
        skill: {
          id: flaggedReview.skill_review.skill.id,
          name: flaggedReview.skill_review.skill.skill_name,
        },
        comment: flaggedReview.skill_review.comment ?? null,
      },
      evidences: evidences.map((evidence) => ({
        id: evidence.id,
        title: evidence.title,
        url: evidence.url,
        evidence_type: evidence.evidence_type,
        description: evidence.description,
        created_at: evidence.created_at.toISO(),
      })),
    }
  }
}
