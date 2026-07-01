import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/reviews/actions/base_query'
import type {
  ReviewSprintReverseHistorySource,
  ReviewUserHistoryReader,
} from '#modules/reviews/actions/ports/outbound/review_user_history_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type {
  UserReviewHistoryDirection,
  UserReviewHistoryItem,
  UserReviewHistoryKind,
  UserReviewHistoryResult,
} from '#modules/reviews/public_contracts/user_review_history'

type SprintReverseRow = ReviewSprintReverseHistorySource

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
  return `/projects/${encodeURIComponent(projectId)}/reviews/tasks?task_id=${encodeURIComponent(taskId)}`
}

function sprintBoardUrl(row: SprintReverseRow): string {
  const board = row.target_type === 'environment' ? 'environment' : 'assigners'
  return `/projects/${encodeURIComponent(row.project_id)}/reviews/${board}?sprint_id=${encodeURIComponent(row.sprint_id)}&workflow_id=${encodeURIComponent(row.workflow_id)}`
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

export default class ListUserReviewHistoryQuery extends BaseQuery<
  Record<never, never>,
  UserReviewHistoryResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly history: ReviewUserHistoryReader
  ) {
    super(execCtx)
  }

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
    const rows = await this.history.listTaskReviewsReceived(userId)

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
    const rows = await this.history.listTaskReviewsSent(userId)

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
    return this.history.listSprintReverseReviews(direction, userId)
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
