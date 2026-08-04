import type { CreateTaskAuthoringState } from '#modules/tasks/actions/dtos/request/task-authoring/create_task_authoring'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskAuthoringSummaryRecord } from '#modules/tasks/types/task_records'

export interface TaskAuthoringSubject {
  readonly title: string
  readonly description: string | undefined
  readonly task_visibility: string
  readonly assigned_to: string | null | undefined
  readonly organization_id: string
  readonly project_id: string
  readonly authoring: CreateTaskAuthoringState
  toObject(): Record<string, unknown>
}

export interface CoordinateTaskAuthoringInput {
  readonly taskId: string
  readonly actorId: string
  readonly dto: TaskAuthoringSubject
  readonly trx: TaskTransaction
}

export interface TaskAuthoringCreateCoordinator {
  persistInitial(input: CoordinateTaskAuthoringInput): Promise<TaskAuthoringSummaryRecord>

  persistVersion(input: CoordinateTaskAuthoringInput): Promise<TaskAuthoringSummaryRecord>
}
