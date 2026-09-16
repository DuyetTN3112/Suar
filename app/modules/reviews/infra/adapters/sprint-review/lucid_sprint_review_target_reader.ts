import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export async function countPendingReverseReviewWorkflows(
  trx: TransactionClientContract,
  sprintId: string
): Promise<number> {
  const row = (await trx
    .from('sprint_reverse_review_workflows')
    .where('sprint_id', sprintId)
    .whereNot('status', 'done')
    .count('* as total')
    .first()) as { total?: string | number } | undefined

  return Number(row?.total ?? 0)
}

export async function countPendingTaskReviews(
  trx: TransactionClientContract,
  sprintId: string
): Promise<number> {
  const rowResult: unknown = await trx.rawQuery(
    `
      select count(*)::int as total
      from task_review_workflows trw
      inner join tasks t on t.id = trw.task_id
      where t.project_sprint_id = ?
        and trw.status <> 'done'
    `,
    [sprintId]
  )
  const row = rowResult as { rows?: { total: number | string }[] }

  return Number(row.rows?.[0]?.total ?? 0)
}

export async function findEligibleReviewerIds(
  trx: TransactionClientContract,
  projectId: string,
  sprintId: string
): Promise<string[]> {
  const rowsResult: unknown = await trx.rawQuery(
    `
      select user_id
      from (
        select t.creator_id as user_id
        from tasks t
        where t.project_id = ? and t.project_sprint_id = ?
        union
        select t.assigned_to as user_id
        from tasks t
        where t.project_id = ? and t.project_sprint_id = ? and t.assigned_to is not null
        union
        select ta.assignee_id as user_id
        from task_assignments ta
        inner join tasks t on t.id = ta.task_id
        where t.project_id = ? and t.project_sprint_id = ?
        union
        select ta.assigned_by as user_id
        from task_assignments ta
        inner join tasks t on t.id = ta.task_id
        where t.project_id = ? and t.project_sprint_id = ?
      ) sprint_workers
      where user_id is not null
    `,
    [projectId, sprintId, projectId, sprintId, projectId, sprintId, projectId, sprintId]
  )
  const rows = rowsResult as { rows?: { user_id: string | null }[] }

  return Array.from(
    new Set(
      (rows.rows ?? [])
        .map((row) => row.user_id)
        .filter((userId): userId is string => Boolean(userId))
    )
  ).sort()
}

export async function findAssignerTargets(
  trx: TransactionClientContract,
  projectId: string,
  sprintId: string
): Promise<Array<{ reviewerId: string; targetUserId: string }>> {
  const rawResult: unknown = await trx.rawQuery(
    `
      select reviewer_id, target_user_id
      from (
        select ta.assignee_id as reviewer_id, ta.assigned_by as target_user_id
        from task_assignments ta
        inner join tasks t on t.id = ta.task_id
        where t.project_id = ? and t.project_sprint_id = ?
        union
        select t.assigned_to as reviewer_id, t.creator_id as target_user_id
        from tasks t
        where t.project_id = ? and t.project_sprint_id = ? and t.assigned_to is not null
      ) assigner_evidence
      where reviewer_id is not null
        and target_user_id is not null
        and reviewer_id <> target_user_id
      group by reviewer_id, target_user_id
    `,
    [projectId, sprintId, projectId, sprintId]
  )
  const result = rawResult as {
    rows?: Array<{ reviewer_id: string; target_user_id: string }>
  }

  return (result.rows ?? []).map((row) => ({
    reviewerId: row.reviewer_id,
    targetUserId: row.target_user_id,
  }))
}

export async function findManagerTargetEvidence(
  trx: TransactionClientContract,
  projectId: string
): Promise<Array<{ userId: string; assignedTaskCount: number; createdTaskCount: number }>> {
  const rowsResult: unknown = await trx.rawQuery(
    `
      select
        user_id,
        sum(assigned_task_count)::int as assigned_task_count,
        sum(created_task_count)::int as created_task_count
      from (
        select assigned_by as user_id, count(*) as assigned_task_count, 0 as created_task_count
        from task_assignments ta
        inner join tasks t on t.id = ta.task_id
        where t.project_id = ?
        group by assigned_by
        union all
        select creator_id as user_id, 0 as assigned_task_count, count(*) as created_task_count
        from tasks
        where project_id = ?
        group by creator_id
      ) evidence
      where user_id is not null
      group by user_id
    `,
    [projectId, projectId]
  )
  const rows = rowsResult as {
    rows?: Array<{
      user_id: string
      assigned_task_count: number | string
      created_task_count: number | string
    }>
  }

  return (rows.rows ?? []).map((row) => ({
    userId: row.user_id,
    assignedTaskCount: Number(row.assigned_task_count),
    createdTaskCount: Number(row.created_task_count),
  }))
}
