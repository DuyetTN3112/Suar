import type { TaskAssignmentCompletedEvent } from '#modules/tasks/public_contracts/task_events'

export interface AssignmentCompletionListenerDependencies {
  processTaskAssignmentCompleted(event: TaskAssignmentCompletedEvent): Promise<boolean>
  logger: {
    error(message: string, context: Record<string, unknown>): void
    info(message: string, context: Record<string, unknown>): void
  }
}

function logSafely(
  logger: AssignmentCompletionListenerDependencies['logger'],
  level: 'error' | 'info',
  message: string,
  context: Record<string, unknown>
): void {
  try {
    logger[level](message, context)
  } catch {
    // Telemetry failure must not replace the listener's original outcome.
  }
}

export async function handleTaskAssignmentCompleted(
  event: TaskAssignmentCompletedEvent,
  dependencies: AssignmentCompletionListenerDependencies
): Promise<void> {
  try {
    const created = await dependencies.processTaskAssignmentCompleted(event)
    if (!created) {
      return
    }

    logSafely(
      dependencies.logger,
      'info',
      'Auto-created review session for completed assignment',
      {
        taskId: event.taskId,
        assignmentId: event.assignmentId,
        assigneeId: event.assigneeId,
      }
    )
  } catch (error) {
    logSafely(
      dependencies.logger,
      'error',
      'Failed to create review session after assignment completion',
      {
        taskId: event.taskId,
        assignmentId: event.assignmentId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      }
    )
    throw error
  }
}
