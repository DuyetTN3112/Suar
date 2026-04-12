import { BaseQuery } from '#actions/shared/base_query'
import AdminFlaggedReviewRepository from '#infra/admin/repositories/admin_flagged_review_repository'
import ReviewEvidenceRepository from '#infra/reviews/repositories/review_evidence_repository'
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
    private flaggedReviewRepo = new AdminFlaggedReviewRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: GetFlaggedReviewDetailDTO): Promise<GetFlaggedReviewDetailResult> {
    const flaggedReview = await this.flaggedReviewRepo.findById(dto.id)
    if (!flaggedReview) {
      throw new Error(`Flagged review not found: ${dto.id}`)
    }

    const reviewSessionId = flaggedReview.skill_review.review_session_id
    const evidences = await ReviewEvidenceRepository.listBySession(reviewSessionId)

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
