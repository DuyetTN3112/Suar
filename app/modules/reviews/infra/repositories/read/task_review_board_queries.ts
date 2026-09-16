import db from '@adonisjs/lucid/services/db'

import {
  emptyTaskReviewBoardColumns,
  TASK_REVIEW_WORKFLOW_STATUSES,
  type TaskReviewBoardCard,
  type TaskReviewBoardResult,
  type TaskReviewBoardWorkflowStatus,
  type TaskReviewWorkflowStatus,
} from '#modules/reviews/domain/task-review/task_review_workflow'
import { TaskStatus, TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'

export {
  getTaskReviewDetailByTask,
  type CompletionReportRow,
  type ReviewAssignmentRow,
  type ReviewMessageRevisionRow,
  type ReviewMessageRow,
  type ReviewReviewerRow,
  type ReviewSessionRow,
  type ReviewWorkflowRow,
} from './task_review_detail_queries.js'

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
  // AI processing is an internal implementation detail for the user workspace.
  // Keep the card in the user-facing reported lane until the next actionable
  // state (admin review) is reached, including after a page reload.
  if (
    status === TASK_REVIEW_WORKFLOW_STATUSES.AI_REVIEWING ||
    status === TASK_REVIEW_WORKFLOW_STATUSES.AI_FAILED
  ) {
    return TASK_REVIEW_WORKFLOW_STATUSES.REPORTED
  }
  // A resolved review is not yet terminal. It remains visibly separate until
  // an accountable governor explicitly finalizes it to Done.
  return status
}

function isUserVisibleTaskReviewBoardStatus(_status: TaskReviewWorkflowStatus): boolean {
  return true
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
      workflowStatus === 'not_opened' ? null : Number(row.required_review_count ?? 1),
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
    if (!isUserVisibleTaskReviewBoardStatus(card.status)) {
      continue
    }
    columnByStatus.get(card.status)?.cards.push(card)
  }

  return {
    projectId,
    columns,
  }
}
