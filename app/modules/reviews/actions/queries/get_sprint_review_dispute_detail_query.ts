import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadSprintReviewDisputeAccessContext,
  loadSprintReviewDisputeComments,
  type SprintReviewDisputeAuthorContext,
} from '#modules/reviews/actions/commands/sprint_review_dispute_access'
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
  reviewPackage: {
    id: string
    reviewerId: string
    status: string
  }
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

interface DisputeDetailRow {
  id: string
  package_id: string
  status: string
  dispute_reason: string
  requested_outcome: string
  reported_to_admin_at: string | null
  sprint_id: string
  sprint_name: string
  project_id: string
  project_name: string
  organization_id: string
  organization_name: string
  reviewer_id: string
  package_status: string
}

export default class GetSprintReviewDisputeDetailQuery {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async handle(disputeId: string): Promise<SprintReviewDisputeDetail> {
    const actorId = this.execCtx.userId
    if (!actorId) {
      throw new UnauthorizedException()
    }

    return db.transaction(async (trx) => {
      const access = await loadSprintReviewDisputeAccessContext(trx, disputeId, actorId)
      if (!access.isParticipant || !access.authorContext) {
        throw new ForbiddenException('Only sprint review dispute participants can view dispute')
      }

      const row = await this.findDispute(trx, disputeId)
      const comments = await loadSprintReviewDisputeComments(trx, disputeId)

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

  private async findDispute(
    trx: TransactionClientContract,
    disputeId: string
  ): Promise<DisputeDetailRow> {
    const row = (await trx
      .from('sprint_review_disputes as srd')
      .innerJoin('sprint_review_packages as srp', 'srp.id', 'srd.package_id')
      .innerJoin('project_sprints as ps', 'ps.id', 'srp.sprint_id')
      .joinRaw('inner join projects as p on p.id::text = ps.project_id')
      .joinRaw('inner join organizations as o on o.id::text = ps.organization_id')
      .where('srd.id', disputeId)
      .select(
        'srd.id',
        'srd.package_id',
        'srd.status',
        'srd.dispute_reason',
        'srd.requested_outcome',
        'srd.reported_to_admin_at',
        'ps.id as sprint_id',
        'ps.name as sprint_name',
        'p.id as project_id',
        'p.name as project_name',
        'ps.organization_id',
        'o.name as organization_name',
        'srp.reviewer_id',
        'srp.status as package_status'
      )
      .first()) as DisputeDetailRow

    return row
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
