import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type {
  ReviewSprintEnvironmentReviewSource,
  ReviewSprintManagerReviewSource,
  ReviewSprintPackageDetailSource,
  ReviewSprintPackageReader,
} from '#modules/reviews/actions/ports/outbound/review_sprint_package_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { resolveEligibleManagerTargets } from '#modules/reviews/domain/sprint_review_rules'

export interface SprintReviewPackageDetail {
  id: string
  sprint_id: string
  reviewer_id: string
  status: string
  sprint_name: string
  project_target: { id: string; name: string }
  organization_target: { id: string; name: string }
  eligible_manager_targets: Array<{
    user_id: string
    target_role: string
    evidence_count: number
  }>
  manager_reviews: SubmittedManagerReview[]
  environment_reviews: SubmittedEnvironmentReview[]
  dispute: SprintReviewPackageDispute | null
}

type SubmittedManagerReview = ReviewSprintManagerReviewSource

type SubmittedEnvironmentReview = ReviewSprintEnvironmentReviewSource

interface SprintReviewPackageDispute {
  id: string
  package_id: string
  status: string
  dispute_reason: string
  requested_outcome: string
  can_report_to_admin: boolean
  comments: Array<{
    id: string
    author_id: string
    author_context: 'reviewer' | 'org_representative' | 'system_admin'
    body: string
    created_at: string
  }>
}

export default class GetSprintReviewPackageDetailQuery {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly packages: ReviewSprintPackageReader
  ) {}

  async handle(packageId: string): Promise<SprintReviewPackageDetail> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const row = await this.packages.findDetail(packageId)

    if (!row) {
      throw new NotFoundException('Sprint review package not found')
    }
    if (row.reviewer_id !== userId) {
      throw new ForbiddenException('Only package reviewer can view sprint review package')
    }

    const [managerTargets, managerReviews, environmentReviews, dispute] = await Promise.all([
      this.findEligibleManagerTargets(row),
      this.findSubmittedManagerReviews(row.id),
      this.findSubmittedEnvironmentReviews(row.id),
      this.findDispute(row.id, row.reviewer_id),
    ])

    return {
      id: row.id,
      sprint_id: row.sprint_id,
      reviewer_id: row.reviewer_id,
      status: row.status,
      sprint_name: row.sprint_name,
      project_target: {
        id: row.project_id,
        name: row.project_name,
      },
      organization_target: {
        id: row.organization_id,
        name: row.organization_name,
      },
      eligible_manager_targets: managerTargets.map((target) => ({
        user_id: target.userId,
        target_role: target.targetRole,
        evidence_count: target.evidenceCount,
      })),
      manager_reviews: managerReviews,
      environment_reviews: environmentReviews,
      dispute,
    }
  }

  private async findSubmittedManagerReviews(packageId: string): Promise<SubmittedManagerReview[]> {
    const rows = await this.packages.listManagerReviews(packageId)

    return rows.map((row) => ({
      ...row,
      rating: row.rating,
    }))
  }

  private async findSubmittedEnvironmentReviews(
    packageId: string
  ): Promise<SubmittedEnvironmentReview[]> {
    const rows = await this.packages.listEnvironmentReviews(packageId)

    return rows.map((row) => ({
      ...row,
      rating: row.rating,
    }))
  }

  private async findEligibleManagerTargets(row: ReviewSprintPackageDetailSource) {
    const evidenceRows = await this.packages.listManagerEvidence(row.project_id)
    const candidates = new Map<
      string,
      {
        userId: string
        assignedTaskCount: number
        createdTaskCount: number
        projectManagerDuringSprint: boolean
        projectOwnerDuringSprint: boolean
        explicitSprintLead: boolean
      }
    >()

    for (const evidence of evidenceRows) {
      candidates.set(evidence.user_id, {
        userId: evidence.user_id,
        assignedTaskCount: Number(evidence.assigned_task_count),
        createdTaskCount: Number(evidence.created_task_count),
        projectManagerDuringSprint: evidence.user_id === row.manager_id,
        projectOwnerDuringSprint: evidence.user_id === row.owner_id,
        explicitSprintLead: false,
      })
    }

    for (const userId of [row.owner_id, row.manager_id]) {
      if (!userId) continue
      const existing = candidates.get(userId)
      candidates.set(userId, {
        userId,
        assignedTaskCount: existing?.assignedTaskCount ?? 0,
        createdTaskCount: existing?.createdTaskCount ?? 0,
        projectManagerDuringSprint: userId === row.manager_id,
        projectOwnerDuringSprint: userId === row.owner_id,
        explicitSprintLead: false,
      })
    }

    return resolveEligibleManagerTargets({
      reviewerId: row.reviewer_id,
      candidates: Array.from(candidates.values()),
    })
  }

  private async findDispute(
    packageId: string,
    reviewerId: string
  ): Promise<SprintReviewPackageDispute | null> {
    const dispute = await this.packages.findDispute(packageId)

    if (!dispute) {
      return null
    }

    const comments = dispute.comments

    const hasReviewerMessage = comments.some((comment) => comment.author_id === reviewerId)
    const hasCounterpartyMessage = comments.some((comment) => comment.author_id !== reviewerId)
    const canReportToAdmin =
      !dispute.reported_to_admin_at &&
      ['pending', 'collecting_evidence'].includes(dispute.status) &&
      hasReviewerMessage &&
      hasCounterpartyMessage

    return {
      id: dispute.id,
      package_id: dispute.package_id,
      status: dispute.status,
      dispute_reason: dispute.dispute_reason,
      requested_outcome: dispute.requested_outcome,
      can_report_to_admin: canReportToAdmin,
      comments: comments.map((comment) => ({
        ...comment,
        author_context: comment.author_id === reviewerId ? 'reviewer' : 'org_representative',
      })),
    }
  }
}
