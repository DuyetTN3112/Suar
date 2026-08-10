import type { TaskAuthoringSummaryRecord } from '#modules/tasks/types/task_records'

export class TaskAuthoringIdempotentReplay extends Error {
  override readonly name = 'TaskAuthoringIdempotentReplay'

  constructor(
    readonly taskId: string,
    readonly specificationVersionId: string,
    readonly contractVersionId: string | null,
    readonly summary: TaskAuthoringSummaryRecord
  ) {
    super(`Task authoring request already completed for task ${taskId}`)
  }
}
