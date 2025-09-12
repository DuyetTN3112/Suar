import emitter from '@adonisjs/core/services/emitter'

import type { TaskAssignmentCommandRepositoryPort } from '../ports/task_assignment_command_repository_port.js'

import type { TaskStatusChangedEvent } from '#events/event_types'
import loggerService from '#infra/logger/logger_service'
import { taskAssignmentCommandRepository } from '#infra/tasks/repositories/write/task_assignment_command_repository'

const completedTaskAssignmentRepository: TaskAssignmentCommandRepositoryPort =
  taskAssignmentCommandRepository

emitter.on('task:status:changed', async (event: TaskStatusChangedEvent) => {
  if (event.newStatusCategory !== 'done') return

  try {
    const completedAssignments =
      await completedTaskAssignmentRepository.completeActiveAssignmentsForCompletedTask({
        taskId: event.taskId,
        assignedTo: event.assignedTo,
        changedBy: event.changedBy,
      })

    for (const assignment of completedAssignments) {
      void emitter.emit('task:assignment:completed', {
        taskId: event.taskId,
        assignmentId: assignment.id,
        assigneeId: assignment.assignee_id,
      })
    }

    if (completedAssignments.length > 0) {
      loggerService.info('Task completed - assignments updated', {
        taskId: event.taskId,
        assignmentsCompleted: completedAssignments.length,
      })
      return
    }

    loggerService.warn('Task moved to done but no assignee/assignment found', {
      taskId: event.taskId,
    })
  } catch (error) {
    loggerService.error('Failed to complete task assignments after task completion', {
      taskId: event.taskId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
