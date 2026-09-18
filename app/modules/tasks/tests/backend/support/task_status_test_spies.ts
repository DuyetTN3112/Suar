import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type Task from '#modules/tasks/infra/models/task-authoring/task'
import type { TaskStatus } from '#modules/tasks/public_contracts/task_constants'

export type NotificationPayload = Parameters<NotificationStager['stage']>[0]

export class NotificationSpy implements NotificationStager {
  public calls: NotificationPayload[] = []

  public stage(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

export class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('task status notification staging failed'))
  }
}

export class TaskEventPublisherSpy implements TaskEventPublisher {
  public statusChangedEvents: Array<{
    taskId: string
    organizationId?: string
    assignedTo: string | null
    oldStatus: string
    newStatusId: string
    newStatus: string
    newStatusCategory: string
    changedBy: string
  }> = []

  publishTaskCreated(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskUpdated(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskDeleted(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskAssignmentCompleted(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskAssigned(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskAccessRevoked(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskApplicationSubmitted(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskApplicationReviewed(): Promise<void> {
    return Promise.resolve()
  }

  publishTaskStatusChanged(event: {
    taskId: string
    organizationId?: string
    assignedTo: string | null
    oldStatus: string
    newStatusId: string
    newStatus: string
    newStatusCategory: string
    changedBy: string
  }): Promise<void> {
    this.statusChangedEvents.push(event)
    return Promise.resolve()
  }
}

export interface StatusTransitionCase {
  prepare: () => Promise<{
    task: Task
    targetStatusId: string
    expectedStatus: TaskStatus
  }>
}
