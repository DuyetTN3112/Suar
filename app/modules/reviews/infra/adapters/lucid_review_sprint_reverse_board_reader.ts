import db from '@adonisjs/lucid/services/db'

import type {
  ReviewSprintReverseBoardReader,
  ReviewSprintReverseRelatedTaskSource,
  ReviewSprintReverseWorkflowSource,
} from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_board_reader'

export default class LucidReviewSprintReverseBoardReader implements ReviewSprintReverseBoardReader {
  async listWorkflows(
    sprintId: string,
    actorId: string
  ): Promise<ReviewSprintReverseWorkflowSource[]> {
    return (await db
      .from('sprint_reverse_review_workflows')
      .where('sprint_id', sprintId)
      .where((query) => {
        void query.where('reviewer_id', actorId).orWhere('responder_id', actorId)
      })
      .orderBy('updated_at', 'desc')
      .leftJoin('users as reviewer', 'reviewer.id', 'sprint_reverse_review_workflows.reviewer_id')
      .leftJoin(
        'users as target_user',
        'target_user.id',
        'sprint_reverse_review_workflows.target_user_id'
      )
      .leftJoin(
        'users as responder',
        'responder.id',
        'sprint_reverse_review_workflows.responder_id'
      )
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
      )) as ReviewSprintReverseWorkflowSource[]
  }

  async listRelatedTasks(input: {
    sprintId: string
    projectId: string
    reviewerId: string
    targetUserId: string
  }): Promise<ReviewSprintReverseRelatedTaskSource[]> {
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
        input.sprintId,
        input.projectId,
        input.reviewerId,
        input.reviewerId,
        input.targetUserId,
        input.targetUserId,
      ]
    )
    return (rawResult as { rows?: ReviewSprintReverseRelatedTaskSource[] }).rows ?? []
  }
}
