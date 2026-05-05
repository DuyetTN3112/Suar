import { reviewExternalDependencies } from '#composition/reviews/review-core/review_external_dependencies_composition'
import { reviewPublicApi } from '#composition/reviews/public-api/review_public_api_composition'
import type {
  ReviewModerationActorContext,
  ReviewModerationGateway,
  ReviewModerationListInput,
  ReviewModerationListResult,
} from '#modules/admin/reviews/actions/ports/outbound/reviews/review_moderation_gateway'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  ReviewAssignmentProjectionReader,
  ReviewModeratorIdentityProjectionReader,
  ReviewSkillIdentityReader,
} from '#modules/reviews/actions/ports/outbound/review_projection_enrichment_readers'

export class ReviewsAdminModerationGatewayAdapter implements ReviewModerationGateway {
  constructor(
    private readonly assignmentProjectionReader: ReviewAssignmentProjectionReader,
    private readonly moderatorIdentityReader: ReviewModeratorIdentityProjectionReader,
    private readonly skillIdentityReader: ReviewSkillIdentityReader
  ) {}

  async list(input: ReviewModerationListInput): Promise<ReviewModerationListResult> {
    const result = await reviewPublicApi.paginateFlaggedReviewsForAdmin(
      input.after || input.before ? 1 : input.page,
      input.perPage,
      input.status,
      input.after,
      input.before,
      {
        ...(input.search ? { search: input.search } : {}),
        ...(input.flagType ? { flagType: input.flagType } : {}),
        ...(input.severity ? { severity: input.severity } : {}),
      },
      this.moderatorIdentityReader,
      this.skillIdentityReader,
      this.assignmentProjectionReader
    )

    return {
      data: result.data.map((flaggedReview) => ({
        id: flaggedReview.id,
        reviewer: {
          id: flaggedReview.suspicious_reviewer.id,
          username: flaggedReview.suspicious_reviewer.username,
          email: flaggedReview.suspicious_reviewer.email ?? '',
        },
        reviewee: {
          id: flaggedReview.reviewee.id,
          username: flaggedReview.reviewee.username,
        },
        reviewed_by: flaggedReview.moderator
          ? {
              id: flaggedReview.moderator.id,
              username: flaggedReview.moderator.username,
            }
          : null,
        comment: flaggedReview.comment,
        flag_type: flaggedReview.flag_type,
        severity: flaggedReview.severity,
        status: flaggedReview.status,
        notes: flaggedReview.notes,
        created_at:
          flaggedReview.detected_at ?? flaggedReview.created_at ?? new Date().toISOString(),
        reviewed_at: flaggedReview.reviewed_at,
      })),
      meta: {
        total: result.total,
        perPage: result.perPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        cursor: {
          nextCursor: result.nextCursor,
          previousCursor: result.previousCursor,
          hasNextPage: result.hasNextPage,
          hasPreviousPage: result.hasPreviousPage,
        },
      },
    }
  }

  async getDetail(id: string) {
    const flaggedReview = await reviewPublicApi.getFlaggedReviewAdminDetail(
      id,
      this.moderatorIdentityReader,
      this.skillIdentityReader,
      this.assignmentProjectionReader
    )
    if (!flaggedReview) {
      return null
    }

    if (!flaggedReview.task) {
      throw new InvariantViolationException(
        `Flagged review ${flaggedReview.id} detail is missing its task projection`
      )
    }
    const evidences = await reviewPublicApi.listEvidencesBySession(
      flaggedReview.review_session_id
    )

    return {
      review: {
        id: flaggedReview.id,
        flag_type: flaggedReview.flag_type,
        severity: flaggedReview.severity,
        status: flaggedReview.status,
        notes: flaggedReview.notes,
        detected_at: flaggedReview.detected_at,
        reviewed_at: flaggedReview.reviewed_at,
        reviewer: {
          id: flaggedReview.suspicious_reviewer.id,
          username: flaggedReview.suspicious_reviewer.username,
          email: flaggedReview.suspicious_reviewer.email,
        },
        reviewee: {
          id: flaggedReview.reviewee.id,
          username: flaggedReview.reviewee.username,
          email: flaggedReview.reviewee.email,
        },
        moderator: flaggedReview.moderator
          ? {
              id: flaggedReview.moderator.id,
              username: flaggedReview.moderator.username,
              email: flaggedReview.moderator.email,
            }
          : null,
        task: {
          id: flaggedReview.task.id,
          title: flaggedReview.task.title,
          description: flaggedReview.task.description,
        },
        skill: {
          id: flaggedReview.skill.id,
          name: flaggedReview.skill.name,
        },
        comment: flaggedReview.comment,
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

  async countPending(): Promise<number> {
    return reviewPublicApi.countPendingFlaggedReviews()
  }

  async resolve(
    input: {
      flaggedReviewId: string
      action: 'dismiss' | 'confirm'
      notes?: string
    },
    actor: ReviewModerationActorContext
  ): Promise<void> {
    await reviewPublicApi.resolveFlaggedReview(
      {
        flagged_review_id: input.flaggedReviewId,
        action: input.action === 'dismiss' ? 'dismissed' : 'confirmed',
        notes: input.notes ?? null,
      },
      actor,
      reviewExternalDependencies.userSkill
    )
  }
}
