import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
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

interface SubmittedManagerReview {
  id: string
  target_user_id: string
  target_role: string
  rating: number
  dimensions: unknown
  comment: string | null
  is_anonymous_to_target: boolean
  created_at: string
}

interface SubmittedEnvironmentReview {
  id: string
  target_type: string
  target_id: string
  rating: number
  dimensions: unknown
  comment: string | null
  is_anonymous_publicly: boolean
  created_at: string
}

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

interface PackageDetailRow {
  id: string
  sprint_id: string
  reviewer_id: string
  status: string
  sprint_name: string
  project_id: string
  project_name: string
  organization_id: string
  organization_name: string
  owner_id: string | null
  manager_id: string | null
}

export default class GetSprintReviewPackageDetailQuery {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async handle(packageId: string): Promise<SprintReviewPackageDetail> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const row = (await db
      .from('sprint_review_packages as srp')
      .innerJoin('project_sprints as ps', 'ps.id', 'srp.sprint_id')
      .joinRaw('inner join projects as p on p.id::text = ps.project_id')
      .joinRaw('inner join organizations as o on o.id::text = ps.organization_id')
      .where('srp.id', packageId)
      .whereNull('p.deleted_at')
      .select(
        'srp.id',
        'srp.sprint_id',
        'srp.reviewer_id',
        'srp.status',
        'ps.name as sprint_name',
        'p.id as project_id',
        'p.name as project_name',
        'ps.organization_id',
        'o.name as organization_name',
        'p.owner_id',
        'p.manager_id'
      )
      .first()) as PackageDetailRow | undefined

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
    const rows = (await db
      .from('sprint_manager_reviews')
      .where('package_id', packageId)
      .orderBy('created_at', 'asc')
      .select(
        'id',
        'target_user_id',
        'target_role',
        'rating',
        'dimensions',
        'comment',
        'is_anonymous_to_target',
        'created_at'
      )) as SubmittedManagerReview[]

    return rows.map((row) => ({
      ...row,
      rating: row.rating,
    }))
  }

  private async findSubmittedEnvironmentReviews(
    packageId: string
  ): Promise<SubmittedEnvironmentReview[]> {
    const rows = (await db
      .from('sprint_environment_reviews')
      .where('package_id', packageId)
      .orderBy('target_type', 'asc')
      .select(
        'id',
        'target_type',
        'target_id',
        'rating',
        'dimensions',
        'comment',
        'is_anonymous_publicly',
        'created_at'
      )) as SubmittedEnvironmentReview[]

    return rows.map((row) => ({
      ...row,
      rating: row.rating,
    }))
  }

  private async findEligibleManagerTargets(row: PackageDetailRow) {
    const evidenceRowsResult: unknown = await db.rawQuery(
      `
        select
          user_id,
          sum(assigned_task_count)::int as assigned_task_count,
          sum(created_task_count)::int as created_task_count
        from (
          select assigned_by as user_id, count(*) as assigned_task_count, 0 as created_task_count
          from task_assignments ta
          inner join tasks t on t.id = ta.task_id
          where t.project_id::text = ?
          group by assigned_by
          union all
          select creator_id as user_id, 0 as assigned_task_count, count(*) as created_task_count
          from tasks
          where project_id::text = ?
          group by creator_id
        ) evidence
        where user_id is not null
        group by user_id
      `,
      [row.project_id, row.project_id]
    )
    const evidenceRows = evidenceRowsResult as {
      rows?: {
        user_id: string
        assigned_task_count: number | string
        created_task_count: number | string
      }[]
    }

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

    for (const evidence of evidenceRows.rows ?? []) {
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
    const dispute = (await db
      .from('sprint_review_disputes')
      .where('package_id', packageId)
      .select(
        'id',
        'package_id',
        'status',
        'dispute_reason',
        'requested_outcome',
        'reported_to_admin_at'
      )
      .first()) as
      | {
          id: string
          package_id: string
          status: string
          dispute_reason: string
          requested_outcome: string
          reported_to_admin_at: string | null
        }
      | undefined

    if (!dispute) {
      return null
    }

    const comments = (await db
      .from('sprint_review_dispute_comments')
      .where('dispute_id', dispute.id)
      .where('visibility', 'all_parties')
      .whereNull('deleted_at')
      .orderBy('created_at', 'asc')
      .select('id', 'author_id', 'body', 'created_at')) as Array<{
      id: string
      author_id: string
      body: string
      created_at: string
    }>

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
