import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface TaskSubmissionReviewSessionInput {
  taskAssignmentId: string
  revieweeId: string
  taskCreatorId: string
}

export interface TaskSubmissionReviewAudience {
  sessionRevieweeId: string
  reviewerIds: string[]
}

export abstract class TaskSubmissionReviewGovernance {
  abstract ensureSession(
    input: TaskSubmissionReviewSessionInput,
    trx: TaskTransaction
  ): Promise<string>

  abstract loadNotificationAudience(
    reviewSessionId: string,
    actorUserId: string,
    trx: TaskTransaction
  ): Promise<TaskSubmissionReviewAudience | null>
}
