import db from '@adonisjs/lucid/services/db'

import type {
  ReviewSprintReverseHistorySource,
  ReviewTaskReceivedHistorySource,
  ReviewTaskSentHistorySource,
  ReviewUserHistoryReader,
} from '#modules/reviews/actions/ports/outbound/review_user_history_reader'
import type { UserReviewHistoryDirection } from '#modules/reviews/public_contracts/user_review_history'

export default class LucidReviewUserHistoryReader implements ReviewUserHistoryReader {
  async listTaskReviewsReceived(userId: string): Promise<ReviewTaskReceivedHistorySource[]> {
    return (await db
      .from('task_review_workflows as trw')
      .innerJoin('tasks as t', 't.id', 'trw.task_id')
      .leftJoin('projects as p', 'p.id', 't.project_id')
      .leftJoin('task_review_messages as trm', (join) => {
        join
          .on('trm.workflow_id', 'trw.id')
          .andOnVal('trm.message_type', 'review')
          .onNull('trm.deleted_at')
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
      )) as ReviewTaskReceivedHistorySource[]
  }

  async listTaskReviewsSent(userId: string): Promise<ReviewTaskSentHistorySource[]> {
    return (await db
      .from('task_review_messages as trm')
      .innerJoin('task_review_workflows as trw', 'trw.id', 'trm.workflow_id')
      .innerJoin('tasks as t', 't.id', 'trw.task_id')
      .leftJoin('projects as p', 'p.id', 't.project_id')
      .leftJoin('users as reviewee', 'reviewee.id', 't.assigned_to')
      .where('trm.author_id', userId)
      .where('trm.message_type', 'review')
      .whereNull('trm.deleted_at')
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
      )) as ReviewTaskSentHistorySource[]
  }

  async listSprintReverseReviews(
    direction: UserReviewHistoryDirection,
    userId: string
  ): Promise<ReviewSprintReverseHistorySource[]> {
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
      )) as ReviewSprintReverseHistorySource[]
  }
}
