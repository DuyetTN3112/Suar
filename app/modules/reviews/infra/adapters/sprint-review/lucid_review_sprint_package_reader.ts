import db from '@adonisjs/lucid/services/db'

import { toOffset } from '#modules/pagination/public_contracts/pagination_public_api'
import type {
  ReviewSprintEnvironmentReviewSource,
  ReviewSprintManagerEvidenceSource,
  ReviewSprintManagerReviewSource,
  ReviewSprintPackageDetailSource,
  ReviewSprintPackageDisputeSource,
  ReviewSprintPackageListRow,
  ReviewSprintPackagePage,
  ReviewSprintPackageReader,
} from '#modules/reviews/actions/ports/outbound/review_sprint_package_reader'

type SprintPackageQuery = ReturnType<typeof db.from>

function selectProjection(query: SprintPackageQuery): SprintPackageQuery {
  return query
    .innerJoin('project_sprints as ps', 'ps.id', 'srp.sprint_id')
    .joinRaw('inner join projects as p on p.id::text = ps.project_id')
    .whereNull('p.deleted_at')
    .select(
      'srp.id',
      'srp.sprint_id',
      'srp.reviewer_id',
      'srp.status',
      'srp.submitted_at',
      'srp.created_at',
      'srp.updated_at',
      'ps.name as sprint_name',
      'ps.starts_at as sprint_starts_at',
      'ps.ends_at as sprint_ends_at',
      'p.id as project_id',
      'p.name as project_name',
      'ps.organization_id'
    )
}

async function paginate(
  query: SprintPackageQuery,
  pagination: { page: number; perPage: number }
): Promise<ReviewSprintPackagePage> {
  const totalRow = (await query.clone().clearSelect().clearOrder().count('* as total').first()) as
    | { total?: string | number }
    | undefined
  const rows = (await query
    .offset(toOffset(pagination.page, pagination.perPage))
    .limit(pagination.perPage)) as ReviewSprintPackageListRow[]

  return {
    rows,
    total: Number(totalRow?.total ?? 0),
  }
}

export default class LucidReviewSprintPackageReader implements ReviewSprintPackageReader {
  listForReviewer(
    reviewerId: string,
    pagination: { page: number; perPage: number }
  ): Promise<ReviewSprintPackagePage> {
    const query = selectProjection(
      db.from('sprint_review_packages as srp').where('srp.reviewer_id', reviewerId)
    )
      .orderBy('ps.ends_at', 'desc')
      .orderBy('srp.updated_at', 'desc')
    return paginate(query, pagination)
  }

  listPendingForReviewer(
    reviewerId: string,
    pagination: { page: number; perPage: number }
  ): Promise<ReviewSprintPackagePage> {
    const query = selectProjection(
      db
        .from('sprint_review_packages as srp')
        .where('srp.reviewer_id', reviewerId)
        .where('srp.status', 'pending')
        .where('ps.status', 'review_open')
    ).orderBy('ps.ends_at', 'desc')
    return paginate(query, pagination)
  }

  async findDetail(packageId: string): Promise<ReviewSprintPackageDetailSource | null> {
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
      .first()) as ReviewSprintPackageDetailSource | undefined
    return row ?? null
  }

  async listManagerReviews(packageId: string): Promise<ReviewSprintManagerReviewSource[]> {
    return (await db
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
      )) as ReviewSprintManagerReviewSource[]
  }

  async listEnvironmentReviews(
    packageId: string
  ): Promise<ReviewSprintEnvironmentReviewSource[]> {
    return (await db
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
      )) as ReviewSprintEnvironmentReviewSource[]
  }

  async listManagerEvidence(projectId: string): Promise<ReviewSprintManagerEvidenceSource[]> {
    const result: unknown = await db.rawQuery(
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
      [projectId, projectId]
    )
    return (
      (result as { rows?: ReviewSprintManagerEvidenceSource[] }).rows ?? []
    )
  }

  async findDispute(packageId: string): Promise<ReviewSprintPackageDisputeSource | null> {
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
      .first()) as Omit<ReviewSprintPackageDisputeSource, 'comments'> | undefined
    if (!dispute) {
      return null
    }

    const comments = (await db
      .from('sprint_review_dispute_comments')
      .where('dispute_id', dispute.id)
      .where('visibility', 'all_parties')
      .whereNull('deleted_at')
      .orderBy('created_at', 'asc')
      .select('id', 'author_id', 'body', 'created_at')) as ReviewSprintPackageDisputeSource['comments']

    return { ...dispute, comments }
  }
}
