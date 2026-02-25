import db from '@adonisjs/lucid/services/db'

import {
  emptyTaskReviewBoardColumns,
  TASK_REVIEW_WORKFLOW_STATUSES,
  type TaskReviewBoardWorkflowStatus,
  type TaskReviewBoardCard,
  type TaskReviewBoardResult,
  type TaskReviewWorkflowStatus,
} from '#modules/reviews/domain/task_review_workflow'
import { TaskStatus, TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'

interface DoneTaskRow {
  task_id: string
  title: string
  description: string | null
  task_status: string | null
  priority: string | null
  label: string | null
  difficulty: string | null
  due_date: Date | string | null
  estimated_time: number | string | null
  project_id: string
  assigned_to: string | null
  reviewee_username: string | null
  creator_id: string | null
  creator_username: string | null
  workflow_id?: string | null
  workflow_status?: string | null
  my_reviewer_status?: string | null
  completed_review_count?: number | string | null
  required_review_count?: number | string | null
  updated_at: Date | string | null
}

export function normalizeWorkflowStatus(
  value: string | null | undefined
): TaskReviewBoardWorkflowStatus {
  if (value === null || value === undefined || value === '') {
    return 'not_opened'
  }

  if (value === 'reviewed') {
    return TASK_REVIEW_WORKFLOW_STATUSES.IN_REVIEW
  }

  const allowed = Object.values(TASK_REVIEW_WORKFLOW_STATUSES)
  return allowed.includes(value as TaskReviewWorkflowStatus)
    ? (value as TaskReviewWorkflowStatus)
    : 'out_of_model'
}

function getLaneStatus(status: TaskReviewBoardWorkflowStatus): TaskReviewWorkflowStatus {
  if (status === 'not_opened') {
    return TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_REVIEW
  }
  if (status === 'out_of_model') {
    return TASK_REVIEW_WORKFLOW_STATUSES.REPORTED
  }
  return status
}

function serializeDate(value: Date | string | null): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

function rowToCard(row: DoneTaskRow, currentUserId: string | null): TaskReviewBoardCard {
  const workflowStatus = normalizeWorkflowStatus(row.workflow_status)
  const status = getLaneStatus(workflowStatus)
  const waitingOnMe =
    row.my_reviewer_status === 'pending' ||
    (workflowStatus === TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE &&
      currentUserId !== null &&
      row.assigned_to === currentUserId)
  return {
    taskId: row.task_id,
    workflowId: row.workflow_id ?? null,
    status,
    workflowStatus,
    title: row.title,
    description: row.description,
    taskStatus: row.task_status,
    priority: row.priority,
    label: row.label,
    difficulty: row.difficulty,
    dueDate: serializeDate(row.due_date),
    estimatedTime: row.estimated_time === null ? null : Number(row.estimated_time),
    revieweeId: row.assigned_to,
    revieweeName: row.reviewee_username,
    creatorId: row.creator_id,
    creatorName: row.creator_username,
    projectId: row.project_id,
    reviewCount: Number(row.completed_review_count ?? 0),
    requiredReviewCount:
      workflowStatus === 'not_opened' ? null : Number(row.required_review_count ?? 2),
    lastActivityAt: serializeDate(row.updated_at),
    waitingOnMe,
  }
}

export async function getTaskReviewBoardByProject(
  projectId: string,
  currentUserId: string | null
): Promise<TaskReviewBoardResult> {
  const columns = emptyTaskReviewBoardColumns()

  if (!currentUserId) {
    return {
      projectId,
      columns,
    }
  }

  const rows = (await db
    .from('tasks as t')
    .leftJoin('task_statuses as ts', 'ts.id', 't.task_status_id')
    .leftJoin('task_review_workflows as trw', 'trw.task_id', 't.id')
    .leftJoin('task_review_reviewers as trr', (join) => {
      join.on('trr.workflow_id', 'trw.id')
      if (currentUserId) {
        join.andOnVal('trr.reviewer_id', currentUserId)
      }
    })
    .leftJoin('users as assignee', 'assignee.id', 't.assigned_to')
    .leftJoin('users as creator', 'creator.id', 't.creator_id')
    .where('t.project_id', projectId)
    .whereNull('t.deleted_at')
    .where((query) => {
      void query
        .where('t.status', TaskStatus.DONE)
        .orWhere('ts.slug', TaskStatus.DONE)
        .orWhere('ts.category', TaskStatusCategory.DONE)
    })
    .select(
      't.id as task_id',
      't.title',
      't.description',
      db.raw('COALESCE(ts.slug, t.status) as task_status'),
      't.priority',
      't.label',
      't.difficulty',
      't.due_date',
      't.estimated_time',
      't.project_id',
      't.assigned_to',
      'assignee.username as reviewee_username',
      't.creator_id',
      'creator.username as creator_username',
      'trw.id as workflow_id',
      'trw.status as workflow_status',
      'trr.status as my_reviewer_status',
      'trw.completed_review_count',
      'trw.required_review_count',
      db.raw('COALESCE(trw.updated_at, t.updated_at) as updated_at')
    )
    .orderByRaw('COALESCE(trw.updated_at, t.updated_at) DESC')) as DoneTaskRow[]

  const columnByStatus = new Map(columns.map((column) => [column.status, column]))

  for (const row of rows) {
    const card = rowToCard(row, currentUserId)
    columnByStatus.get(card.status)?.cards.push(card)
  }

  return {
    projectId,
    columns,
  }
}

export async function getTaskReviewDetailByTask(
  taskId: string
): Promise<Record<string, unknown> | null> {
  const task = (await db
    .from('tasks as t')
    .leftJoin('task_statuses as ts', 'ts.id', 't.task_status_id')
    .leftJoin('users as assignee', 'assignee.id', 't.assigned_to')
    .leftJoin('users as creator', 'creator.id', 't.creator_id')
    .where('t.id', taskId)
    .whereNull('t.deleted_at')
    .select(
      't.id',
      't.title',
      't.description',
      db.raw(
        'case when ts.category = ? then ? else coalesce(ts.slug, t.status) end as status',
        [TaskStatusCategory.DONE, TaskStatus.DONE]
      ),
      't.priority',
      't.difficulty',
      't.due_date',
      't.acceptance_criteria',
      't.verification_method',
      't.expected_deliverables',
      't.project_id',
      't.organization_id',
      't.assigned_to',
      'assignee.username as assignee_name',
      't.creator_id',
      'creator.username as creator_name'
    )
    .first()) as Record<string, unknown> | null

  if (!task) {
    return null
  }

  const workflow = (await db.from('task_review_workflows').where('task_id', taskId).first()) as
    | (Record<string, unknown> & { id: string })
    | null

  const comments = await db
    .from('task_comments as tc')
    .leftJoin('users as author', 'author.id', 'tc.author_id')
    .where('tc.task_id', taskId)
    .whereNull('tc.deleted_at')
    .select(
      'tc.id',
      'tc.body',
      'tc.comment_type',
      'tc.visibility',
      'tc.created_at',
      'author.id as author_id',
      'author.username as author_name'
    )
    .orderBy('tc.created_at', 'asc')

  const reviewers = workflow
    ? await db
        .from('task_review_reviewers as trr')
        .leftJoin('users as reviewer', 'reviewer.id', 'trr.reviewer_id')
        .where('trr.workflow_id', workflow.id)
        .select(
          'trr.id',
          'trr.reviewer_id',
          'reviewer.username as reviewer_name',
          'trr.reviewer_role',
          'trr.status',
          'trr.priority_rank',
          'trr.reviewed_at'
        )
        .orderBy('trr.priority_rank', 'asc')
    : []

  const reviewMessages = workflow
    ? await db
        .from('task_review_messages as trm')
        .leftJoin('users as author', 'author.id', 'trm.author_id')
        .where('trm.workflow_id', workflow.id)
        .select(
          'trm.id',
          'trm.author_id',
          'author.username as author_name',
          'trm.message_type',
          'trm.body',
          'trm.created_at'
        )
        .orderBy('trm.created_at', 'asc')
    : []

  return {
    task,
    workflow,
    reviewers,
    comments,
    reviewMessages,
  }
}
