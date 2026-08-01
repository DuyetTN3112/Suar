import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type {
  SprintReviewDisputeAuthorContext,
  SprintReviewDisputeUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/sprint_review_dispute_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface SprintReviewDisputeDetail {
  id: string
  packageId: string
  status: string
  disputeReason: string
  requestedOutcome: string
  reportedToAdminAt: string | null
  sprint: {
    id: string
    name: string
    projectId: string
    projectName: string
    organizationId: string
    organizationName: string
  }
  reviewPackage: { id: string; reviewerId: string; status: string }
  comments: Array<{
    id: string
    authorId: string
    authorContext: SprintReviewDisputeAuthorContext
    body: string
    createdAt: string
  }>
  authorContext: SprintReviewDisputeAuthorContext
  canReportToAdmin: boolean
}

export default class GetSprintReviewDisputeDetailQuery {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly disputes: SprintReviewDisputeUnitOfWork
  ) {}

  async handle(disputeId: string): Promise<SprintReviewDisputeDetail> {
    const actorId = this.execCtx.userId
    if (!actorId) throw new UnauthorizedException()

    return this.disputes.run(async (session) => {
      const access = await session.loadAccess(disputeId, actorId)
      if (!access.isParticipant || !access.authorContext) {
        throw new ForbiddenException('Only sprint review dispute participants can view dispute')
      }

      const row = await session.loadDetail(disputeId)
      const comments = await session.listComments(disputeId)
      const hasReviewerMessage = comments.some(
        (comment) => comment.author_id === access.reviewPackage.reviewer_id
      )
      const hasCounterpartyMessage = comments.some(
        (comment) => comment.author_id !== access.reviewPackage.reviewer_id
      )

      return {
        id: row.id,
        packageId: row.package_id,
        status: row.status,
        disputeReason: row.dispute_reason,
        requestedOutcome: row.requested_outcome,
        reportedToAdminAt: toIsoLike(row.reported_to_admin_at),
        sprint: {
          id: row.sprint_id,
          name: row.sprint_name,
          projectId: row.project_id,
          projectName: row.project_name,
          organizationId: row.organization_id,
          organizationName: row.organization_name,
        },
        reviewPackage: {
          id: row.package_id,
          reviewerId: row.reviewer_id,
          status: row.package_status,
        },
        comments: comments.map((comment) => ({
          id: comment.id,
          authorId: comment.author_id,
          authorContext:
            comment.author_id === access.reviewPackage.reviewer_id
              ? 'reviewer'
              : 'org_representative',
          body: comment.body,
          createdAt: toIsoLike(comment.created_at) ?? '',
        })),
        authorContext: access.authorContext,
        canReportToAdmin:
          !row.reported_to_admin_at &&
          ['pending', 'collecting_evidence'].includes(row.status) &&
          hasReviewerMessage &&
          hasCounterpartyMessage,
      }
    })
  }
}

function toIsoLike(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
  }
  if (value instanceof Date) return value.toISOString()
  return null
}
