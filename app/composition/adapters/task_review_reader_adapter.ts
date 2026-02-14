import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { reviewPublicApi } from '#composition/review_public_api_composition'
import type { TaskReviewReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import ReviewAssignmentContextV1Query from '#modules/tasks/actions/queries/review_assignment_context_v1_query'
import { LucidTaskFactSourceReader } from '#modules/tasks/infra/adapters/lucid_task_fact_source_reader'

export class TaskReviewReaderAdapter implements TaskReviewReader {
  private readonly assignmentContexts = new ReviewAssignmentContextV1Query(
    new LucidTaskFactSourceReader()
  )

  async hasAnyReviewForTask(taskId: string, trx?: TransactionClientContract): Promise<boolean> {
    const assignmentIds = await this.assignmentContexts.listAssignmentIdsByTaskIds(
      [taskId],
      trx
    )
    return reviewPublicApi.hasAnyForTaskAssignmentIds(assignmentIds, trx)
  }

  async hasAnyReviewForTasksWithStatus(
    taskStatusId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const assignmentIds =
      await this.assignmentContexts.listAssignmentIdsByTaskStatusIds(
        [taskStatusId],
        trx
      )
    return reviewPublicApi.hasAnyForTaskAssignmentIds(assignmentIds, trx)
  }

  getTaskReviewDetail(taskId: string): Promise<Record<string, unknown> | null> {
    return reviewPublicApi.getTaskReviewDetail(taskId)
  }

  async getTaskReviewZoneSummary(taskId: string) {
    const submission = (await db
      .from('task_submissions')
      .where('task_id', taskId)
      .orderBy('updated_at', 'desc')
      .orderBy('created_at', 'desc')
      .select('id', 'status')
      .first()) as { id: string; status: string } | undefined

    const reviewSession = (await db
      .from('review_sessions as rs')
      .join('task_assignments as ta', 'ta.id', 'rs.task_assignment_id')
      .where('ta.task_id', taskId)
      .orderBy('rs.created_at', 'desc')
      .select(
        'rs.id',
        'rs.status',
        'rs.creator_review_completed',
        'rs.manager_reviews_count',
        'rs.peer_reviews_count',
        'rs.required_total_reviews',
        'rs.required_peer_reviews'
      )
      .first()) as
      | {
          id: string
          status: string
          creator_review_completed: boolean | null
          manager_reviews_count: number | null
          peer_reviews_count: number | null
          required_total_reviews: number | null
          required_peer_reviews: number | null
        }
      | undefined

    const dispute = reviewSession
      ? ((await db
          .from('review_disputes')
          .where('review_session_id', reviewSession.id)
          .orderBy('created_at', 'desc')
          .select('id', 'status')
          .first()) as { id: string; status: string } | undefined)
      : undefined
    const pendingAssignments = reviewSession
      ? ((await db
          .from('review_session_reviewer_assignments')
          .where('review_session_id', reviewSession.id)
          .where('status', 'pending')
          .select('is_required')) as Array<{ is_required: boolean }>)
      : []

    if (!submission && !reviewSession && !dispute) return null

    const requiredPendingAssignments = pendingAssignments.filter(
      (row) => row.is_required
    ).length
    return {
      submission_id: submission?.id ?? null,
      submission_status: submission?.status ?? null,
      review_session_id: reviewSession?.id ?? null,
      review_session_status: reviewSession?.status ?? null,
      dispute_id: dispute?.id ?? null,
      dispute_status: dispute?.status ?? null,
      creator_review_completed: reviewSession?.creator_review_completed ?? null,
      manager_reviews_count: reviewSession?.manager_reviews_count ?? 0,
      peer_reviews_count: reviewSession?.peer_reviews_count ?? 0,
      required_total_reviews: reviewSession?.required_total_reviews ?? null,
      required_peer_reviews: reviewSession?.required_peer_reviews ?? null,
      required_pending_assignments: requiredPendingAssignments,
      optional_pending_assignments:
        pendingAssignments.length - requiredPendingAssignments,
    }
  }

  async hasTaskReviewWorkflow(
    taskId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const client = trx ?? db
    const workflow: unknown = await client
      .from('task_review_workflows')
      .where('task_id', taskId)
      .first()
    return Boolean(workflow)
  }

  async ensureTaskReviewWorkflow(
    taskId: string,
    changedBy: string,
    trx: TransactionClientContract
  ): Promise<void> {
    await reviewPublicApi.ensureTaskReviewWorkflow(
      taskId,
      {
        userId: changedBy,
        ip: '0.0.0.0',
        userAgent: 'task-completion-outbox',
        organizationId: null,
      },
      trx
    )
  }
}
