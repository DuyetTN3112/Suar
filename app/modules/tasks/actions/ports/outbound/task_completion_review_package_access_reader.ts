import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface TaskCompletionReviewPackageAccessInput {
  readonly actorId: string
  readonly reportId: string
  readonly taskId: string
  readonly taskAssignmentId: string
}

/**
 * Cross-module reviewer/authority grant. The Tasks module owns package facts;
 * composition supplies review eligibility without Tasks querying Review tables.
 */
export interface TaskCompletionReviewPackageAccessReader {
  canRead(
    input: TaskCompletionReviewPackageAccessInput,
    transaction?: TaskTransaction
  ): Promise<boolean>
}
