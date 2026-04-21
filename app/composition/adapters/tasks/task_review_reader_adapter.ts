import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { reviewPublicApi } from '#composition/reviews/public-api/review_public_api_composition'
import type { TaskReviewReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import ReviewAssignmentContextV1Query from '#modules/tasks/actions/queries/task-applications/review_assignment_context_v1_query'
import { LucidTaskFactSourceReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_fact_source_reader'

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

  async listTaskReviewerIds(
    taskId: string,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    const client = trx ?? db
    const rows = (await client
      .from('task_review_reviewers as reviewer')
      .join('task_review_workflows as workflow', 'workflow.id', 'reviewer.workflow_id')
      .where('workflow.task_id', taskId)
      .select('reviewer.reviewer_id')
      .distinct()) as Array<{ reviewer_id: string }>
    return rows.map((row) => row.reviewer_id)
  }

  async getTaskAssignmentContractLifecycle(
    taskId: string,
    assignmentId: string,
    trx?: TransactionClientContract
  ): Promise<'review' | 'dispute' | 'legacy_unpinned_workflow' | null> {
    const client = trx ?? db
    const activeDispute = (await client
      .from('review_disputes')
      .where('task_id', taskId)
      .where('task_assignment_id', assignmentId)
      .whereIn('status', [
        'pending',
        'collecting_evidence',
        'admin_reviewing',
        'ai_reviewing',
      ])
      .select('id')
      .first()) as { id: string } | undefined
    if (activeDispute) return 'dispute'

    const reviewSession = (await client
      .from('review_sessions as rs')
      .join('task_assignments as ta', 'ta.id', 'rs.task_assignment_id')
      .where('rs.task_assignment_id', assignmentId)
      .where('ta.task_id', taskId)
      .orderBy('rs.created_at', 'desc')
      .select('rs.status')
      .first()) as { status: string } | undefined
    const taskWorkflow = (await client
      .from('task_review_workflows as trw')
      .where('trw.task_assignment_id', assignmentId)
      .where('trw.task_id', taskId)
      .orderBy('trw.updated_at', 'desc')
      .select('trw.status')
      .first()) as { status: string } | undefined
    const legacyWorkflow = (await client
      .from('task_review_workflows as trw')
      .where('trw.task_id', taskId)
      .whereNull('trw.task_assignment_id')
      .whereIn('trw.status', [
        'awaiting_review',
        'in_review',
        'awaiting_response',
        'disputed',
        'reported',
        'ai_reviewing',
      ])
      .select('trw.id')
      .first()) as { id: string } | undefined

    if (
      reviewSession?.status === 'disputed' ||
      (taskWorkflow && ['disputed', 'reported', 'ai_reviewing'].includes(taskWorkflow.status))
    ) {
      return 'dispute'
    }
    if (
      (reviewSession && ['pending', 'in_progress'].includes(reviewSession.status)) ||
      (taskWorkflow &&
        ['awaiting_review', 'in_review', 'awaiting_response'].includes(taskWorkflow.status))
    ) {
      return 'review'
    }
    if (legacyWorkflow) return 'legacy_unpinned_workflow'
    return null
  }

  async ensureTaskReviewWorkflow(
    taskId: string,
    taskAssignmentId: string,
    changedBy: string,
    trx: TransactionClientContract
  ): Promise<void> {
    await reviewPublicApi.ensureTaskReviewWorkflow(
      taskId,
      taskAssignmentId,
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
