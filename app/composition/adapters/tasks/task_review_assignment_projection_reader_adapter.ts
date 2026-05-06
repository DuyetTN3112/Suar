import { ReviewAssignmentProjectionReader } from '#modules/reviews/actions/ports/outbound/review_projection_enrichment_readers'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'
import ReviewAssignmentContextV1Query from '#modules/tasks/actions/queries/task-applications/review_assignment_context_v1_query'
import { LucidTaskFactSourceReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_fact_source_reader'

export class TaskReviewAssignmentProjectionReaderAdapter extends ReviewAssignmentProjectionReader {
  private readonly contexts = new ReviewAssignmentContextV1Query(
    new LucidTaskFactSourceReader()
  )

  async findReviewAssignmentContextsV1(
    assignmentIds: string[],
    trx?: Parameters<ReviewAssignmentProjectionReader['findReviewAssignmentContextsV1']>[1]
  ) {
    const contexts = await this.contexts.find(assignmentIds, toLucidReviewTransaction(trx))

    return contexts.map((context) => ({
      contractVersion: 1 as const,
      id: context.id,
      taskId: context.taskId,
      assigneeId: context.assigneeId,
      assignmentStatus: context.assignmentStatus,
      estimatedHours: context.estimatedHours,
      actualHours: context.actualHours,
      completionNotes: context.completionNotes,
      task: { ...context.task },
    }))
  }

  async listAssignmentIdsByProjectIdsIncludingDeletedTasks(
    projectIds: string[],
    trx?: Parameters<
      ReviewAssignmentProjectionReader['listAssignmentIdsByProjectIdsIncludingDeletedTasks']
    >[1]
  ): Promise<string[]> {
    return this.contexts.listAssignmentIdsByProjectIdsIncludingDeletedTasks(
      projectIds,
      toLucidReviewTransaction(trx)
    )
  }
}
