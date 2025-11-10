import emitter from '@adonisjs/core/services/emitter'

import type { ReviewSessionCommandRepositoryPort } from '../ports/review_session_command_repository_port.js'

import loggerService from '#modules/logger/public_contracts/logger_service'
import { reviewSessionCommandRepository } from '#modules/reviews/infra/repositories/write/review_session_command_repository'
import type { TaskAssignmentCompletedEvent } from '#modules/tasks/events/task_events'

const completedAssignmentReviewSessionRepository: ReviewSessionCommandRepositoryPort =
  reviewSessionCommandRepository

emitter.on('task:assignment:completed', async (event: TaskAssignmentCompletedEvent) => {
  try {
    const created =
      await completedAssignmentReviewSessionRepository.createForCompletedAssignmentIfMissing({
        assignmentId: event.assignmentId,
        assigneeId: event.assigneeId,
      })

    if (!created) {
      return
    }

    loggerService.info('Auto-created review session for completed assignment', {
      taskId: event.taskId,
      assignmentId: event.assignmentId,
      assigneeId: event.assigneeId,
    })
  } catch (error) {
    loggerService.error('Failed to create review session after assignment completion', {
      taskId: event.taskId,
      assignmentId: event.assignmentId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
