import db from '@adonisjs/lucid/services/db'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  emptySprintReverseReviewBoardSection,
  type SprintReverseReviewBoard,
  type SprintReverseReviewCard,
  type SprintReverseReviewStatus,
  type SprintReverseReviewTargetType,
} from '#modules/reviews/domain/sprint_reverse_review_workflow'

interface WorkflowRow {
  id: string
  sprint_id: string
  project_id: string
  organization_id: string
  reviewer_id: string
  target_type: SprintReverseReviewTargetType
  target_user_id: string | null
  target_entity_id: string | null
  responder_id: string | null
  status: SprintReverseReviewStatus
  rating: number | null
  comment: string | null
  updated_at: string
  reviewer_username: string | null
  reviewer_email: string | null
  target_username: string | null
  target_email: string | null
  responder_username: string | null
  responder_email: string | null
}

interface RelatedTaskRow {
  id: string
  title: string
  status: string
  assigned_to: string | null
}

export default class GetSprintReverseReviewBoardQuery {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async handle(input: { sprint_id: string }): Promise<SprintReverseReviewBoard> {
    const actorId = this.execCtx.userId
    if (!actorId) {
      throw new UnauthorizedException()
    }

    const rows = (await db
      .from('sprint_reverse_review_workflows')
      .where('sprint_id', input.sprint_id)
      .where((query) => {
        void query.where('reviewer_id', actorId).orWhere('responder_id', actorId)
      })
      .orderBy('updated_at', 'desc')
      .leftJoin('users as reviewer', 'reviewer.id', 'sprint_reverse_review_workflows.reviewer_id')
      .leftJoin('users as target_user', 'target_user.id', 'sprint_reverse_review_workflows.target_user_id')
      .leftJoin('users as responder', 'responder.id', 'sprint_reverse_review_workflows.responder_id')
      .select(
        'sprint_reverse_review_workflows.id',
        'sprint_reverse_review_workflows.sprint_id',
        'sprint_reverse_review_workflows.project_id',
        'sprint_reverse_review_workflows.organization_id',
        'sprint_reverse_review_workflows.reviewer_id',
        'sprint_reverse_review_workflows.target_type',
        'sprint_reverse_review_workflows.target_user_id',
        'sprint_reverse_review_workflows.target_entity_id',
        'sprint_reverse_review_workflows.responder_id',
        'sprint_reverse_review_workflows.status',
        'sprint_reverse_review_workflows.rating',
        'sprint_reverse_review_workflows.comment',
        'sprint_reverse_review_workflows.updated_at',
        'reviewer.username as reviewer_username',
        'reviewer.email as reviewer_email',
        'target_user.username as target_username',
        'target_user.email as target_email',
        'responder.username as responder_username',
        'responder.email as responder_email'
      )) as WorkflowRow[]

    const relatedTaskCounts = await this.countRelatedTasks(rows)
    const relatedTasks = await this.listRelatedTasks(rows)
    const board: SprintReverseReviewBoard = {
      assigner: emptySprintReverseReviewBoardSection(),
      environment: emptySprintReverseReviewBoardSection(),
    }

    for (const row of rows) {
      const card: SprintReverseReviewCard = {
        id: row.id,
        sprint_id: row.sprint_id,
        project_id: row.project_id,
        organization_id: row.organization_id,
        reviewer_id: row.reviewer_id,
        target_type: row.target_type,
        target_user_id: row.target_user_id,
        target_entity_id: row.target_entity_id,
        responder_id: row.responder_id,
        status: row.status,
        comment: row.comment,
        updated_at: row.updated_at,
        rating: row.rating,
        related_task_count: relatedTaskCounts.get(row.id) ?? 0,
        related_tasks: relatedTasks.get(row.id) ?? [],
        reviewer: {
          id: row.reviewer_id,
          username: row.reviewer_username,
          email: row.reviewer_email,
        },
        target_user: row.target_user_id
          ? {
              id: row.target_user_id,
              username: row.target_username,
              email: row.target_email,
            }
          : null,
        responder: row.responder_id
          ? {
              id: row.responder_id,
              username: row.responder_username,
              email: row.responder_email,
            }
          : null,
      }
      const section = row.target_type === 'assigner' ? board.assigner : board.environment
      section.columns[row.status].cards.push(card)
    }

    return board
  }

  private async countRelatedTasks(rows: WorkflowRow[]): Promise<Map<string, number>> {
    const assignerRows = rows.filter(
      (row) => row.target_type === 'assigner' && row.target_user_id !== null
    )
    if (assignerRows.length === 0) {
      return new Map()
    }

    const counts = new Map<string, number>()
    for (const row of assignerRows) {
      const rawResult: unknown = await db.rawQuery(
        `
          select count(distinct t.id)::int as total
          from tasks t
          left join task_assignments ta on ta.task_id = t.id
          where t.project_sprint_id = ?
            and t.project_id = ?
            and (
              t.assigned_to = ?
              or ta.assignee_id = ?
            )
            and (
              t.creator_id = ?
              or ta.assigned_by = ?
            )
        `,
        [
          row.sprint_id,
          row.project_id,
          row.reviewer_id,
          row.reviewer_id,
          row.target_user_id,
          row.target_user_id,
        ]
      )
      const result = rawResult as { rows?: { total: number | string }[] }
      counts.set(row.id, Number(result.rows?.[0]?.total ?? 0))
    }

    return counts
  }

  private async listRelatedTasks(rows: WorkflowRow[]): Promise<Map<string, RelatedTaskRow[]>> {
    const assignerRows = rows.filter(
      (row) => row.target_type === 'assigner' && row.target_user_id !== null
    )
    if (assignerRows.length === 0) {
      return new Map()
    }

    const tasks = new Map<string, RelatedTaskRow[]>()
    for (const row of assignerRows) {
      const rawResult: unknown = await db.rawQuery(
        `
          select distinct
            t.id::text as id,
            t.title,
            t.status,
            t.assigned_to::text as assigned_to
          from tasks t
          left join task_assignments ta on ta.task_id = t.id
          where t.project_sprint_id = ?
            and t.project_id = ?
            and (
              t.assigned_to = ?
              or ta.assignee_id = ?
            )
            and (
              t.creator_id = ?
              or ta.assigned_by = ?
            )
          order by t.title asc
        `,
        [
          row.sprint_id,
          row.project_id,
          row.reviewer_id,
          row.reviewer_id,
          row.target_user_id,
          row.target_user_id,
        ]
      )
      const result = rawResult as { rows?: RelatedTaskRow[] }
      tasks.set(row.id, result.rows ?? [])
    }

    return tasks
  }
}
