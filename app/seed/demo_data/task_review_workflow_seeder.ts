import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { DISPUTE_SCENARIO_SPECS } from './dispute_scenario_specs.js'
import type { SeedRuntime } from './seed_runtime.js'
import { findRow } from './seed_utils.js'
import type { SeedContext, SeededTask, SeededUser } from './types.js'

const TASK_CONTEXT_COLUMNS = [
  'id',
  'title',
  'status',
  'priority',
  'assigned_to',
  'creator_id',
  'organization_id',
  'project_id',
  'project_sprint_id',
  'due_date',
  'updated_at',
] as const

interface TaskReviewWorkflowRow {
  id: string
}

interface DoneTaskReviewSeedRow {
  task_id: string
  task_title: string
  project_id: string
  organization_id: string
  reviewee_id: string
  creator_id: string
  assignment_id: string
  assigned_by: string
}

export function getOrdinaryTaskReviewSeedState(): {
  status: 'awaiting_review'
  completedReviewCount: 0
} {
  return {
    status: 'awaiting_review',
    completedReviewCount: 0,
  }
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function parseJsonFields(row: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const output = { ...row }
  for (const field of fields) {
    if (field in output) {
      output[field] = parseJsonValue(output[field])
    }
  }
  return output
}

async function loadPartyContext(
  trx: TransactionClientContract,
  user: SeededUser,
  scope: { organizationId: string; projectId: string; sprintId: string | null }
): Promise<Record<string, unknown>> {
  const profile = (await trx
    .from('user_profile_snapshots')
    .where('user_id', user.id)
    .select(
      'id',
      'version',
      'snapshot_name',
      'is_current',
      'is_public',
      'summary',
      'skills_verified',
      'work_highlights',
      'performance_metrics',
      'trust_metrics',
      'created_at',
      'updated_at'
    )
    .orderBy('is_current', 'desc')
    .orderBy('version', 'desc')
    .first()) as Record<string, unknown> | undefined

  const taskHistory = (await trx
    .from('user_work_history')
    .where('user_id', user.id)
    .where('organization_id', scope.organizationId)
    .where('project_id', scope.projectId)
    .select(
      'id',
      'task_id',
      'task_assignment_id',
      'organization_id',
      'project_id',
      'task_title',
      'task_type',
      'business_domain',
      'problem_category',
      'role_in_task',
      'difficulty',
      'estimated_hours',
      'actual_hours',
      'was_on_time',
      'completed_at'
    )
    .orderBy('completed_at', 'desc')
    .limit(10)) as Record<string, unknown>[]

  let workScheduleQuery = trx
    .from('tasks')
    .whereNull('deleted_at')
    .where('organization_id', scope.organizationId)
    .where('project_id', scope.projectId)
    .where((builder) => {
      void builder.where('assigned_to', user.id).orWhere('creator_id', user.id)
    })

  if (scope.sprintId) {
    workScheduleQuery = workScheduleQuery.where('project_sprint_id', scope.sprintId)
  }

  const workSchedule = (await workScheduleQuery
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('due_date', 'asc')
    .orderBy('updated_at', 'desc')
    .limit(10)) as Record<string, unknown>[]

  return {
    user_id: user.id,
    username: user.username,
    system_role: user.systemRole,
    current_organization_id: scope.organizationId,
    profile: profile
      ? parseJsonFields(profile, [
          'summary',
          'skills_verified',
          'work_highlights',
          'performance_metrics',
          'trust_metrics',
        ])
      : {},
    work_schedule: workSchedule,
    task_history: taskHistory,
  }
}

async function loadTaskContext(
  trx: TransactionClientContract,
  task: SeededTask
): Promise<Record<string, unknown>> {
  const row = (await trx
    .from('tasks')
    .where('id', task.id)
    .select(...TASK_CONTEXT_COLUMNS, 'description', 'task_type', 'business_domain')
    .first()) as Record<string, unknown> | undefined

  return row ?? { id: task.id, title: task.title }
}

async function loadRelatedTasks(
  trx: TransactionClientContract,
  tasks: SeededTask[]
): Promise<Record<string, unknown>[]> {
  if (tasks.length === 0) {
    return []
  }

  return (await trx
    .from('tasks')
    .whereIn(
      'id',
      tasks.map((task) => task.id)
    )
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')) as Record<string, unknown>[]
}

async function loadSprintPeerTasks(
  trx: TransactionClientContract,
  sprintId: string | null
): Promise<Record<string, unknown>[]> {
  if (!sprintId) {
    return []
  }

  return (await trx
    .from('tasks')
    .where('project_sprint_id', sprintId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')) as Record<string, unknown>[]
}

async function listEligibleReviewerIds(
  trx: TransactionClientContract,
  task: DoneTaskReviewSeedRow
): Promise<string[]> {
  const rows = (await trx
    .from('project_members as pm')
    .join('organization_users as ou', (join) => {
      join
        .on('ou.user_id', '=', 'pm.user_id')
        .andOnVal('ou.organization_id', '=', task.organization_id)
    })
    .where('pm.project_id', task.project_id)
    .where('ou.status', 'approved')
    .whereNot('pm.user_id', task.reviewee_id)
    .select('pm.user_id', 'pm.project_role', 'ou.org_role')) as {
    user_id: string
    project_role: string | null
    org_role: string | null
  }[]

  const priority = new Map<string, number>([
    [task.creator_id, 0],
    [task.assigned_by, 1],
  ])
  return rows
    .sort((left, right) => {
      const leftPriority = priority.get(left.user_id) ?? 10
      const rightPriority = priority.get(right.user_id) ?? 10
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
      }
      const leftLeader =
        left.project_role === 'project_owner' ||
        left.project_role === 'project_manager' ||
        left.org_role === 'org_owner' ||
        left.org_role === 'org_admin'
      const rightLeader =
        right.project_role === 'project_owner' ||
        right.project_role === 'project_manager' ||
        right.org_role === 'org_owner' ||
        right.org_role === 'org_admin'
      return Number(rightLeader) - Number(leftLeader)
    })
    .map((row) => row.user_id)
    .filter((userId, index, values) => values.indexOf(userId) === index)
    .slice(0, 2)
}

async function seedOrdinaryTaskReviewWorkflows(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  excludedTaskId: string
): Promise<void> {
  const rawRows = (await trx
    .from('tasks as t')
    .join('task_statuses as task_status', 'task_status.id', 't.task_status_id')
    .join('task_assignments as assignment', (join) => {
      join
        .on('assignment.task_id', '=', 't.id')
        .andOn('assignment.assignee_id', '=', 't.assigned_to')
    })
    .where('task_status.category', 'done')
    .whereNot('t.id', excludedTaskId)
    .whereNull('t.deleted_at')
    .whereNotNull('t.assigned_to')
    .select(
      't.id as task_id',
      't.title as task_title',
      't.project_id',
      't.organization_id',
      't.assigned_to as reviewee_id',
      't.creator_id',
      'assignment.id as assignment_id',
      'assignment.assigned_by'
    )
    .orderBy('t.sort_order', 'asc')) as DoneTaskReviewSeedRow[]
  const tasks = rawRows.filter(
    (row, index, rows) => rows.findIndex((candidate) => candidate.task_id === row.task_id) === index
  )
  for (const task of tasks) {
    const reviewerIds = await listEligibleReviewerIds(trx, task)
    if (reviewerIds.length === 0) {
      throw new Error(`No eligible non-self reviewer for completed task ${task.task_title}`)
    }

    const seedState = getOrdinaryTaskReviewSeedState()
    const status = seedState.status
    const requiredReviewCount = reviewerIds.length
    const completedReviewCount = seedState.completedReviewCount
    const existing = (await findRow(trx, 'task_review_workflows', {
      task_id: task.task_id,
    })) as TaskReviewWorkflowRow | null
    const workflowId = existing?.id ?? runtime.uuid()
    const runtimeContext = {
      schema_version: 'suar_task_review_workflow_runtime_context_v1',
      source_type: 'task_review_workflow',
      workflow: { status },
      task: {
        id: task.task_id,
        title: task.task_title,
        project_id: task.project_id,
        organization_id: task.organization_id,
      },
      assignment: {
        id: task.assignment_id,
        assigned_by: task.assigned_by,
        assignee_id: task.reviewee_id,
      },
      reviewer_ids: reviewerIds,
      narrative:
        'Công việc đã hoàn tất và được đưa qua cổng đánh giá; trạng thái workflow thể hiện đúng bên đang chờ hành động.',
    }
    const completedAt =
      status === 'done' ? runtime.isoDaysAgo(1, 16) : null
    const workflowPayload = {
      task_id: task.task_id,
      task_assignment_id: task.assignment_id,
      project_id: task.project_id,
      organization_id: task.organization_id,
      reviewee_id: task.reviewee_id,
      status,
      required_review_count: requiredReviewCount,
      completed_review_count: completedReviewCount,
      accepted_by_reviewee_at: completedAt,
      reported_at: null,
      reported_by: null,
      completed_at: completedAt,
      final_decision: null,
      final_rationale: null,
      resolved_at: null,
      resolved_by: null,
      runtime_context: runtime.toJson(runtimeContext),
      created_at: runtime.isoDaysAgo(3, 9),
      updated_at: runtime.isoDaysAgo(3, 9),
    }

    if (existing) {
      await trx.from('task_review_workflows').where('id', workflowId).update(workflowPayload)
    } else {
      await trx
        .insertQuery()
        .table('task_review_workflows')
        .insert({ id: workflowId, ...workflowPayload })
    }

    await trx.from('task_review_reviewers').where('workflow_id', workflowId).delete()
    await trx.from('task_review_messages').where('workflow_id', workflowId).delete()

    for (const [reviewerIndex, reviewerId] of reviewerIds.entries()) {
      const submitted = reviewerIndex < completedReviewCount
      await trx.table('task_review_reviewers').insert({
        id: runtime.uuid(),
        workflow_id: workflowId,
        reviewer_id: reviewerId,
        reviewer_role:
          reviewerId === task.assigned_by ? 'task_giver_required' : 'peer_required',
        is_required: true,
        status: submitted ? 'submitted' : 'pending',
        priority_rank: reviewerIndex + 1,
        reviewed_at: submitted ? runtime.isoDaysAgo(2 - reviewerIndex, 14) : null,
        created_at: runtime.isoDaysAgo(3, 9),
        updated_at: submitted
          ? runtime.isoDaysAgo(2 - reviewerIndex, 14)
          : runtime.isoDaysAgo(3, 9),
      })

      if (submitted) {
        await trx.table('task_review_messages').insert({
          id: runtime.uuid(),
          workflow_id: workflowId,
          author_id: reviewerId,
          message_type: 'review',
          body:
            reviewerIndex === 0
              ? 'Kết quả bàn giao đáp ứng tiêu chí nghiệm thu; các chứng cứ chính đã được đối chiếu với phạm vi công việc.'
              : 'Đánh giá đồng cấp xác nhận chất lượng thực thi và ghi rõ khuyến nghị cho vòng cải tiến tiếp theo.',
          metadata: runtime.toJson({
            score: reviewerIndex === 0 ? 4.5 : 4.25,
            reviewer_role:
              reviewerId === task.assigned_by ? 'task_giver_required' : 'peer_required',
          }),
          created_at: runtime.isoDaysAgo(2 - reviewerIndex, 14),
        })
      }
    }

    if (status === 'done') {
      await trx.table('task_review_messages').insert({
        id: runtime.uuid(),
        workflow_id: workflowId,
        author_id: task.reviewee_id,
        message_type: 'response',
        body:
          'Tôi xác nhận kết quả đánh giá, các điểm mạnh được ghi nhận và hành động cải tiến cho công việc tiếp theo.',
        metadata: runtime.toJson({ response: 'accepted' }),
        created_at: runtime.isoDaysAgo(1, 16),
      })
    }
  }
}

export async function seedTaskReviewWorkflows(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  context: SeedContext
): Promise<void> {
  const scenario = runtime.requireValue(
    DISPUTE_SCENARIO_SPECS.find((item) => item.key === 'taskReviewEvidenceUnderscored'),
    'dispute-scenario:taskReviewEvidenceUnderscored'
  )
  const task = runtime.requireValue(context.tasks[scenario.primaryTask], scenario.primaryTask)
  const assignment = runtime.requireValue(
    context.assignments[scenario.primaryTask],
    `assignment:${scenario.primaryTask}`
  )
  const taskGiver = context.users[scenario.taskGiver]
  const reviewee = context.users[scenario.worker]
  const peerReviewer = context.users[scenario.counterparty]
  const relatedTasks = scenario.relatedTasks
    .map((taskKey) => context.tasks[taskKey])
    .filter((relatedTask): relatedTask is SeededTask => Boolean(relatedTask))
  const primaryTask = await loadTaskContext(trx, task)
  const sprintId =
    typeof primaryTask['project_sprint_id'] === 'string' ? primaryTask['project_sprint_id'] : null
  const scope = {
    organizationId: task.organizationId,
    projectId: runtime.requireValue(task.projectId ?? undefined, `task-project:${task.title}`),
    sprintId,
  }
  const runtimeContext = {
    schema_version: 'suar_task_review_workflow_runtime_context_v1',
    source_type: 'task_review_workflow',
    dispute_review_type: scenario.reviewType,
    workflow: { status: 'resolved' },
    organization: context.organizations[scenario.organization],
    project: context.projects[scenario.project],
    sprint: sprintId ? (context.sprints[scenario.sprint ?? ''] ?? { id: sprintId }) : null,
    task: primaryTask,
    assignment,
    dispute_claim: {
      dispute_reason:
        'Quản lý và reviewer ngang hàng chấm điểm thấp hơn mức mà chứng cứ liên kết thể hiện.',
      requested_outcome: scenario.expectedDecision ?? 'adjust_score',
    },
    task_giver_context: await loadPartyContext(trx, taskGiver, scope),
    reviewee_context: await loadPartyContext(trx, reviewee, scope),
    reporter_context: await loadPartyContext(trx, reviewee, scope),
    reviewer_contexts: [
      { reviewer_id: taskGiver.id, reviewer_role: 'task_giver_required' },
      { reviewer_id: peerReviewer.id, reviewer_role: 'peer_required' },
    ],
    related_project_tasks: await loadRelatedTasks(trx, [task, ...relatedTasks]),
    sprint_peer_tasks: await loadSprintPeerTasks(trx, sprintId),
    comments: [],
  }

  const existing = (await findRow(trx, 'task_review_workflows', {
    task_id: task.id,
  })) as TaskReviewWorkflowRow | null
  const workflowId = existing?.id ?? runtime.uuid()
  const workflowPayload = {
    task_id: task.id,
    task_assignment_id: assignment.id,
    project_id: scope.projectId,
    organization_id: task.organizationId,
    reviewee_id: reviewee.id,
    status: 'resolved',
    required_review_count: 2,
    completed_review_count: 2,
    accepted_by_reviewee_at: null,
    reported_at: runtime.isoDaysAgo(0, 11),
    reported_by: reviewee.id,
    completed_at: null,
    final_decision: scenario.expectedDecision ?? 'adjust_score',
    final_rationale:
      'Chứng cứ bàn giao và lịch sử trao đổi xác nhận phạm vi thực hiện ở mức cao hơn điểm ban đầu; hội đồng điều chỉnh điểm và yêu cầu làm rõ rubric cho kỳ tiếp theo.',
    resolved_at: runtime.isoDaysAgo(0, 16),
    resolved_by: context.users.superadmin.id,
    runtime_context: runtime.toJson(runtimeContext),
    created_at: runtime.isoDaysAgo(2, 9),
    updated_at: runtime.isoDaysAgo(0, 16),
  }

  if (existing) {
    await trx.from('task_review_workflows').where('id', workflowId).update(workflowPayload)
  } else {
    await trx
      .insertQuery()
      .table('task_review_workflows')
      .insert({ id: workflowId, ...workflowPayload })
  }

  await trx.from('task_review_reviewers').where('workflow_id', workflowId).delete()
  await trx.from('task_review_messages').where('workflow_id', workflowId).delete()

  await trx.table('task_review_reviewers').multiInsert([
    {
      id: runtime.uuid(),
      workflow_id: workflowId,
      reviewer_id: taskGiver.id,
      reviewer_role: 'task_giver_required',
      is_required: true,
      status: 'submitted',
      priority_rank: 1,
      reviewed_at: runtime.isoDaysAgo(1, 14),
      created_at: runtime.isoDaysAgo(2, 9),
      updated_at: runtime.isoDaysAgo(1, 14),
    },
    {
      id: runtime.uuid(),
      workflow_id: workflowId,
      reviewer_id: peerReviewer.id,
      reviewer_role: 'peer_required',
      is_required: true,
      status: 'submitted',
      priority_rank: 2,
      reviewed_at: runtime.isoDaysAgo(1, 15),
      created_at: runtime.isoDaysAgo(2, 9),
      updated_at: runtime.isoDaysAgo(1, 15),
    },
  ])

  await trx.table('task_review_messages').multiInsert([
    {
      id: runtime.uuid(),
      workflow_id: workflowId,
      author_id: taskGiver.id,
      message_type: 'review',
      body: 'Checklist kiểm định đã đầy đủ, nhưng rubric chấm điểm cần tách bạch rõ hơn giữa độ bao phủ và tác động lên hồ sơ năng lực.',
      metadata: runtime.toJson({ score: 3, reviewer_role: 'task_giver_required' }),
      created_at: runtime.isoDaysAgo(1, 14),
    },
    {
      id: runtime.uuid(),
      workflow_id: workflowId,
      author_id: peerReviewer.id,
      message_type: 'review',
      body: 'Chứng cứ ủng hộ kết quả bàn giao, nhưng các ví dụ rubric chưa được thống nhất trước khi chấm điểm.',
      metadata: runtime.toJson({ score: 3, reviewer_role: 'peer_required' }),
      created_at: runtime.isoDaysAgo(1, 15),
    },
    {
      id: runtime.uuid(),
      workflow_id: workflowId,
      author_id: reviewee.id,
      message_type: 'system',
      body: 'Đã báo cáo tranh chấp phiên đánh giá: chứng cứ liên kết ủng hộ việc điều chỉnh điểm.',
      metadata: runtime.toJson({ runtime_context: runtimeContext }),
      created_at: runtime.isoDaysAgo(0, 11),
    },
  ])

  await seedOrdinaryTaskReviewWorkflows(runtime, trx, task.id)
}
