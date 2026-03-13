import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import { RepositoryFactory } from '#repositories/index'
import type {
  TaskApplicationSubmittedEvent,
  TaskApplicationReviewedEvent,
} from '#events/event_types'

/**
 * Notification Listener — Sprint 7
 *
 * Creates notifications for task application events.
 * Uses NotificationRepository (mysql/mongodb/both via RepositoryFactory).
 */

// === Task Application Submitted ===
// Notify the project owner when someone applies to a task
emitter.on('task:application:submitted', async (event: TaskApplicationSubmittedEvent) => {
  try {
    const repo = await RepositoryFactory.getNotificationRepository()

    await repo.create({
      user_id: event.ownerId,
      title: 'Yêu cầu tham gia task mới',
      message: `Có người đã đăng ký tham gia task của bạn.`,
      type: 'task_application',
      related_entity_type: 'task_application',
      related_entity_id: event.applicationId,
    })

    loggerService.debug('Notification sent for task application', {
      applicationId: event.applicationId,
      taskId: event.taskId,
      notifiedUser: event.ownerId,
    })
  } catch (error) {
    loggerService.error('NotificationListener: task application submitted failed', {
      applicationId: event.applicationId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// === Task Application Reviewed ===
// Notify the applicant when their application is approved/rejected
emitter.on('task:application:reviewed', async (event: TaskApplicationReviewedEvent) => {
  try {
    const repo = await RepositoryFactory.getNotificationRepository()

    const isApproved = event.status === 'approved'
    const title = isApproved ? 'Yêu cầu được chấp nhận' : 'Yêu cầu bị từ chối'
    const message = isApproved
      ? 'Yêu cầu tham gia task của bạn đã được chấp nhận.'
      : 'Yêu cầu tham gia task của bạn đã bị từ chối.'

    await repo.create({
      user_id: event.applicantId,
      title,
      message,
      type: 'task_application_review',
      related_entity_type: 'task_application',
      related_entity_id: event.applicationId,
    })

    loggerService.debug('Notification sent for task application review', {
      applicationId: event.applicationId,
      status: event.status,
      notifiedUser: event.applicantId,
    })
  } catch (error) {
    loggerService.error('NotificationListener: task application reviewed failed', {
      applicationId: event.applicationId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
