import type {
  TaskAssignedV1,
  TaskAssignmentCompletedV1,
  TaskStatusChangedV1,
  TaskUnassignedV1,
} from '#modules/tasks/public_contracts/task_events_v1'

export type TaskPublicEventV1 =
  | TaskAssignedV1
  | TaskUnassignedV1
  | TaskStatusChangedV1
  | TaskAssignmentCompletedV1

export interface TaskEventPublisher {
  publish(event: TaskPublicEventV1): Promise<void>
}
