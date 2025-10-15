import db from '@adonisjs/lucid/services/db'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export type UserReviewHistoryDirection = 'received' | 'sent'
export type UserReviewHistoryKind =
  | 'task_received'
  | 'task_sent'
  | 'manager_received'
  | 'manager_sent'
  | 'environment_received'
  | 'environment_sent'

export interface UserReviewHistoryItem {
  id: string
  direction: UserReviewHistoryDirection
  kind: UserReviewHistoryKind
  title: string
  contextLabel: string
  counterpartLabel: string
  status: string
  rating: number | null
  comment: string | null
  submittedAt: string | null
  detailUrl: string
}

export interface UserReviewHistoryResult {
  received: UserReviewHistoryItem[]
  sent: UserReviewHistoryItem[]
  stats: {
    received: number
    sent: number
  }
}

interface TaskReceivedRow {
  workflow_id: string
  task_id: string
  task_title: string
  project_id: string
  project_name: string | null
  status: string
  completed_review_count: number | string | null
  required_review_count: number | string | null
  updated_at: unknown
  last_reviewed_at: unknown
}

interface TaskSentRow {
  message_id: string
  task_id: string
  task_title: string
  project_id: string
  project_name: string | null
  reviewee_name: string | null
  reviewee_email: string | null
  status: string
  body: string | null
  created_at: unknown
}

interface SprintReverseRow {
  workflow_id: string
  sprint_id: string
  sprint_name: string | null
  project_id: string
  project_name: string | null
  target_type: 'assigner' | 'environment'
  target_user_name: string | null
  target_user_email: string | null
  status: string
  rating: number | string | null
  comment: string | null
  submitted_at: unknown
  updated_at: unknown
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

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function sortByRecent(items: UserReviewHistoryItem[]): UserReviewHistoryItem[] {
  return [...items].sort((left, right) => {
    const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : 0
    const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : 0
    return rightTime - leftTime
  })
}

function taskBoardUrl(projectId: string, taskId: string): string {
  return `/reviews/task-board?project_id=${encodeURIComponent(projectId)}&task_id=${encodeURIComponent(taskId)}`
}

function sprintBoardUrl(row: SprintReverseRow): string {
  const reviewType = row.target_type === 'environment' ? 'environment' : 'manager'
  return `/reviews/sprint-reverse-board?review_type=${reviewType}&sprint_id=${encodeURIComponent(row.sprint_id)}&workflow_id=${encodeURIComponent(row.workflow_id)}`
}

function sprintReviewTitle(row: SprintReverseRow, direction: UserReviewHistoryDirection): string {
  if (row.target_type === 'environment') {
    return direction === 'received' ? 'Review môi trường cần phản hồi' : 'Review môi trường đã gửi'
  }

  return direction === 'received'
    ? 'Review người giao việc về bạn'
    : 'Review người giao việc đã gửi'
}

function sprintCounterpartLabel(
  row: SprintReverseRow,
  direction: UserReviewHistoryDirection
): string {
  if (direction === 'received') {
    return 'Người gửi: Ẩn danh'
  }
  if (row.target_type === 'environment') {
    return 'Đối tượng: môi trường project / tổ chức'
  }

  return `Người được review: ${row.target_user_name ?? row.target_user_email ?? 'Không rõ'}`
}

function sprintKind(
  row: SprintReverseRow,
  direction: UserReviewHistoryDirection
): UserReviewHistoryKind {
  if (row.target_type === 'environment') {
    return direction === 'received' ? 'environment_received' : 'environment_sent'
  }

  return direction === 'received' ? 'manager_received' : 'manager_sent'
}

export default class ListUserReviewHistoryQuery {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async handle(): Promise<UserReviewHistoryResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const [taskReceived, taskSent, sprintReceived, sprintSent] = await Promise.all([
      this.listTaskReviewsReceived(userId),
      this.listTaskReviewsSent(userId),
      this.listSprintReviewsReceived(userId),
      this.listSprintReviewsSent(userId),
    ])

    const received = sortByRecent([...taskReceived, ...sprintReceived])
    const sent = sortByRecent([...taskSent, ...sprintSent])

    return {
      received,
      sent,
      stats: {
        received: received.length,
        sent: sent.length,
      },
    }
  }

  private async listTaskReviewsReceived(userId: string): Promise<UserReviewHistoryItem[]> {
    const rows = (await db
      .from('task_review_workflows as trw')
      .innerJoin('tasks as t', 't.id', 'trw.task_id')
      .leftJoin('projects as p', 'p.id', 't.project_id')
      .leftJoin('task_review_messages as trm', (join) => {
        join.on('trm.workflow_id', 'trw.id').andOnVal('trm.message_type', 'review')
      })
      .where('t.assigned_to', userId)
      .whereNull('t.deleted_at')
      .groupBy(
        'trw.id',
        't.id',
        't.title',
        't.project_id',
        'p.name',
        'trw.status',
        'trw.completed_review_count',
        'trw.required_review_count',
        'trw.updated_at'
      )
      .orderByRaw('coalesce(max(trm.created_at), trw.updated_at) desc')
      .limit(80)
      .select(
        'trw.id as workflow_id',
        't.id as task_id',
        't.title as task_title',
        't.project_id',
        'p.name as project_name',
        'trw.status',
        'trw.completed_review_count',
        'trw.required_review_count',
        'trw.updated_at',
        db.raw('max(trm.created_at) as last_reviewed_at')
      )) as TaskReceivedRow[]

    return rows.map((row) => ({
      id: row.workflow_id,
      direction: 'received',
      kind: 'task_received',
      title: `Review task: ${row.task_title}`,
      contextLabel: row.project_name ?? 'Project không rõ',
      counterpartLabel: `${Number(row.completed_review_count ?? 0)}/${Number(row.required_review_count ?? 0)} reviewer đã gửi`,
      status: row.status,
      rating: null,
      comment: null,
      submittedAt: toIsoLike(row.last_reviewed_at) ?? toIsoLike(row.updated_at),
      detailUrl: taskBoardUrl(row.project_id, row.task_id),
    }))
  }

  private async listTaskReviewsSent(userId: string): Promise<UserReviewHistoryItem[]> {
    const rows = (await db
      .from('task_review_messages as trm')
      .innerJoin('task_review_workflows as trw', 'trw.id', 'trm.workflow_id')
      .innerJoin('tasks as t', 't.id', 'trw.task_id')
      .leftJoin('projects as p', 'p.id', 't.project_id')
      .leftJoin('users as reviewee', 'reviewee.id', 't.assigned_to')
      .where('trm.author_id', userId)
      .where('trm.message_type', 'review')
      .whereNull('t.deleted_at')
      .orderBy('trm.created_at', 'desc')
      .limit(80)
      .select(
        'trm.id as message_id',
        't.id as task_id',
        't.title as task_title',
        't.project_id',
        'p.name as project_name',
        'reviewee.username as reviewee_name',
        'reviewee.email as reviewee_email',
        'trw.status',
        'trm.body',
        'trm.created_at'
      )) as TaskSentRow[]

    return rows.map((row) => ({
      id: row.message_id,
      direction: 'sent',
      kind: 'task_sent',
      title: `Review task: ${row.task_title}`,
      contextLabel: row.project_name ?? 'Project không rõ',
      counterpartLabel: `Người làm task: ${row.reviewee_name ?? row.reviewee_email ?? 'Không rõ'}`,
      status: row.status,
      rating: null,
      comment: row.body,
      submittedAt: toIsoLike(row.created_at),
      detailUrl: taskBoardUrl(row.project_id, row.task_id),
    }))
  }

  private async listSprintReviewsReceived(userId: string): Promise<UserReviewHistoryItem[]> {
    const rows = await this.listSprintReverseReviews('received', userId)
    return rows.map((row) => this.toSprintHistoryItem(row, 'received'))
  }

  private async listSprintReviewsSent(userId: string): Promise<UserReviewHistoryItem[]> {
    const rows = await this.listSprintReverseReviews('sent', userId)
    return rows.map((row) => this.toSprintHistoryItem(row, 'sent'))
  }

  private async listSprintReverseReviews(
    direction: UserReviewHistoryDirection,
    userId: string
  ): Promise<SprintReverseRow[]> {
    const query = db
      .from('sprint_reverse_review_workflows as srw')
      .innerJoin('project_sprints as ps', 'ps.id', 'srw.sprint_id')
      .joinRaw('left join projects as p on p.id::text = srw.project_id::text')
      .leftJoin('users as target_user', 'target_user.id', 'srw.target_user_id')
      .whereNotNull('srw.submitted_at')

    if (direction === 'received') {
      void query.where('srw.responder_id', userId)
    } else {
      void query.where('srw.reviewer_id', userId)
    }

    return (await query
      .orderBy('srw.submitted_at', 'desc')
      .limit(80)
      .select(
        'srw.id as workflow_id',
        'srw.sprint_id',
        'ps.name as sprint_name',
        'srw.project_id',
        'p.name as project_name',
        'srw.target_type',
        'target_user.username as target_user_name',
        'target_user.email as target_user_email',
        'srw.status',
        'srw.rating',
        'srw.comment',
        'srw.submitted_at',
        'srw.updated_at'
      )) as SprintReverseRow[]
  }

  private toSprintHistoryItem(
    row: SprintReverseRow,
    direction: UserReviewHistoryDirection
  ): UserReviewHistoryItem {
    return {
      id: row.workflow_id,
      direction,
      kind: sprintKind(row, direction),
      title: sprintReviewTitle(row, direction),
      contextLabel: `${row.project_name ?? 'Project không rõ'} · ${row.sprint_name ?? 'Sprint không rõ'}`,
      counterpartLabel: sprintCounterpartLabel(row, direction),
      status: row.status,
      rating: numberOrNull(row.rating),
      comment: row.comment,
      submittedAt: toIsoLike(row.submitted_at) ?? toIsoLike(row.updated_at),
      detailUrl: sprintBoardUrl(row),
    }
  }
}
