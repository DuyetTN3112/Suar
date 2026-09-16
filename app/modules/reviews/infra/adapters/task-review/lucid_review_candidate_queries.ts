import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { ReviewTaskReviewerSuggestion } from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'

export async function listReviewerCandidates(
  transaction: TransactionClientContract,
  projectId: string,
  organizationId: string,
  excludedUserIds: readonly string[]
): Promise<
  Array<{ userId: string; projectRole: string | null; organizationRole: string | null }>
> {
  const candidates = (await transaction
    .from('organization_users as ou')
    .leftJoin('project_members as pm', (join) => {
      join.on('pm.user_id', 'ou.user_id').andOnVal('pm.project_id', projectId)
    })
    .where('ou.organization_id', organizationId)
    .where('ou.status', 'approved')
    .whereNotIn('ou.user_id', Array.from(excludedUserIds))
    .select('ou.user_id', 'pm.project_role', 'ou.org_role')
    .select(
      transaction.raw(`
        CASE
          WHEN pm.project_role = 'project_owner' THEN 10
          WHEN pm.project_role = 'project_manager' THEN 20
          WHEN ou.org_role = 'org_owner' THEN 30
          WHEN ou.org_role = 'org_admin' THEN 40
          WHEN pm.project_role = 'project_member' THEN 80
          ELSE 100
        END as priority_rank
      `)
    )
    .orderBy('priority_rank', 'asc')
    .orderByRaw('COALESCE(pm.created_at, ou.created_at) asc')) as Array<{
    user_id: string
    project_role: string | null
    org_role: string | null
  }>

  return candidates.map((candidate) => ({
    userId: candidate.user_id,
    projectRole: candidate.project_role,
    organizationRole: candidate.org_role,
  }))
}

export async function listSuggestedReviewerCandidates(
  transaction: TransactionClientContract,
  taskId: string,
  projectId: string,
  organizationId: string,
  excludedUserIds: readonly string[]
): Promise<ReviewTaskReviewerSuggestion[]> {
  const candidates = (await transaction
    .from('organization_users as ou')
    .leftJoin('project_members as pm', (join) => {
      join.on('pm.user_id', 'ou.user_id').andOnVal('pm.project_id', projectId)
    })
    .where('ou.organization_id', organizationId)
    .where('ou.status', 'approved')
    .whereNotIn('ou.user_id', Array.from(excludedUserIds))
    .where((query) => {
      void query
        .whereIn('pm.project_role', ['project_owner', 'project_manager'])
        .orWhereIn('ou.org_role', ['org_owner', 'org_admin'])
        .orWhereRaw(
          `EXISTS (
            SELECT 1 FROM task_comments AS comment
            WHERE comment.task_id = ?
              AND comment.author_id = ou.user_id
              AND comment.deleted_at IS NULL
          )`,
          [taskId]
        )
        .orWhereRaw(
          `EXISTS (
            SELECT 1
            FROM task_comment_mentions AS mention
            JOIN task_comments AS comment ON comment.id = mention.task_comment_id
            WHERE comment.task_id = ?
              AND comment.deleted_at IS NULL
              AND mention.mentioned_user_id = ou.user_id
          )`,
          [taskId]
        )
        .orWhereRaw(
          `EXISTS (
            SELECT 1
            FROM task_review_reviewers AS historical_reviewer
            JOIN task_review_workflows AS historical_workflow
              ON historical_workflow.id = historical_reviewer.workflow_id
            WHERE historical_workflow.project_id = ?
              AND historical_reviewer.reviewer_id = ou.user_id
              AND historical_reviewer.status = 'submitted'
          )`,
          [projectId]
        )
    })
    .select('ou.user_id', 'pm.project_role', 'ou.org_role')
    .select(
      transaction.raw(
        `EXISTS (
          SELECT 1 FROM task_comments AS comment
          WHERE comment.task_id = ?
            AND comment.author_id = ou.user_id
            AND comment.deleted_at IS NULL
        ) AS has_task_comment`,
        [taskId]
      ),
      transaction.raw(
        `EXISTS (
          SELECT 1
          FROM task_comment_mentions AS mention
          JOIN task_comments AS comment ON comment.id = mention.task_comment_id
          WHERE comment.task_id = ?
            AND comment.deleted_at IS NULL
            AND mention.mentioned_user_id = ou.user_id
        ) AS is_mentioned_in_task`,
        [taskId]
      ),
      transaction.raw(
        `EXISTS (
          SELECT 1
          FROM task_review_reviewers AS historical_reviewer
          JOIN task_review_workflows AS historical_workflow
            ON historical_workflow.id = historical_reviewer.workflow_id
          WHERE historical_workflow.project_id = ?
            AND historical_reviewer.reviewer_id = ou.user_id
            AND historical_reviewer.status = 'submitted'
        ) AS has_review_history`,
        [projectId]
      )
    )
    .orderByRaw(`
      CASE
        WHEN pm.project_role = 'project_owner' THEN 10
        WHEN pm.project_role = 'project_manager' THEN 20
        WHEN ou.org_role = 'org_owner' THEN 30
        WHEN ou.org_role = 'org_admin' THEN 40
        WHEN EXISTS (
          SELECT 1 FROM task_comments AS comment
          WHERE comment.task_id = ?
            AND comment.author_id = ou.user_id
            AND comment.deleted_at IS NULL
        ) THEN 60
        WHEN EXISTS (
          SELECT 1
          FROM task_comment_mentions AS mention
          JOIN task_comments AS comment ON comment.id = mention.task_comment_id
          WHERE comment.task_id = ?
            AND comment.deleted_at IS NULL
            AND mention.mentioned_user_id = ou.user_id
        ) THEN 70
        ELSE 80
      END ASC`, [taskId, taskId])
    .orderBy('ou.created_at', 'asc')) as Array<{
    user_id: string
    project_role: string | null
    org_role: string | null
    has_task_comment: boolean
    is_mentioned_in_task: boolean
    has_review_history: boolean
  }>

  return candidates.map((candidate) => {
    const reasons: string[] = []
    if (candidate.project_role === 'project_owner') reasons.push('project_owner')
    if (candidate.project_role === 'project_manager') reasons.push('project_manager')
    if (candidate.org_role === 'org_owner') reasons.push('org_owner')
    if (candidate.org_role === 'org_admin') reasons.push('org_admin')
    if (candidate.has_task_comment) reasons.push('task_commenter')
    if (candidate.is_mentioned_in_task) reasons.push('mentioned_in_task')
    if (candidate.has_review_history) reasons.push('active_project_reviewer')
    return {
      userId: candidate.user_id,
      projectRole: candidate.project_role,
      organizationRole: candidate.org_role,
      reasons,
    }
  })
}
