import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type {
  OrganizationCreatedEvent,
  ProjectCreatedEvent,
  MessageSentEvent,
  MessageDeletedEvent,
  TaskUpdatedEvent,
  TaskStatusChangedEvent,
} from '#events/event_types'

/**
 * Organization Listeners
 *
 * Gốc từ MySQL trigger: after_organization_insert
 *
 * ⚠️ Owner membership đã được tạo trong CreateOrganizationCommand (step 5).
 * Listener chỉ log event — KHÔNG duplicate insert.
 */
emitter.on('organization:created', (event: OrganizationCreatedEvent) => {
  loggerService.info('Organization created event', {
    orgId: event.organization.id,
    ownerId: event.ownerId,
    ip: event.ip,
  })
})

/**
 * Project Listeners
 *
 * Gốc từ MySQL trigger: after_project_insert
 *
 * ⚠️ Owner membership đã được tạo trong CreateProjectCommand (step 7).
 * Listener chỉ log event — KHÔNG duplicate insert.
 */
emitter.on('project:created', (event: ProjectCreatedEvent) => {
  loggerService.info('Project created event', {
    projectId: event.project.id,
    creatorId: event.creatorId,
    organizationId: event.organizationId,
  })
})

/**
 * Message Listeners
 *
 * Thay thế MySQL trigger: update_last_message_at
 * Logic: Khi message mới → update conversations.last_message_at và last_message_id
 */
emitter.on('message:sent', async (event: MessageSentEvent) => {
  try {
    const { default: Conversation } = await import('#models/conversation')

    await Conversation.query().where('id', event.conversation.id).update({
      last_message_at: new Date(),
      last_message_id: event.message.id,
    })

    loggerService.debug('Updated conversation last_message_at', {
      conversationId: event.conversation.id,
      messageId: event.message.id,
    })
  } catch (error) {
    loggerService.error('Failed to update conversation last_message_at', {
      conversationId: event.conversation.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

/**
 * Message Delete Listener
 *
 * Thay thế MySQL trigger: after_message_delete
 * Logic: Khi message bị xóa → update last_message_id của conversation
 */
emitter.on('message:deleted', async (event: MessageDeletedEvent) => {
  try {
    const { default: Message } = await import('#models/message')
    const { default: Conversation } = await import('#models/conversation')

    // Tìm message mới nhất còn lại trong conversation
    const latestMessage = await Message.query()
      .where('conversation_id', event.conversationId)
      .orderBy('created_at', 'desc')
      .first()

    await Conversation.query()
      .where('id', event.conversationId)
      .update({
        last_message_id: latestMessage?.id ?? null,
        last_message_at: latestMessage?.created_at.toISO() ?? null,
      })

    loggerService.debug('Updated conversation after message delete', {
      conversationId: event.conversationId,
      deletedMessageId: event.messageId,
    })
  } catch (error) {
    loggerService.error('Failed to update conversation after message delete', {
      conversationId: event.conversationId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

/**
 * Task Version Listener
 *
 * Thay thế MySQL trigger: task_version_after_update
 * Logic: Khi task được update → tạo snapshot trong task_versions
 */
emitter.on('task:updated', async (event: TaskUpdatedEvent) => {
  try {
    if (Object.keys(event.changes).length === 0) {
      return // Không có thay đổi thực sự
    }

    const { default: db } = await import('@adonisjs/lucid/services/db')

    await db.table('task_versions').insert({
      task_id: event.task.id,
      changed_by: event.updatedBy,
      changes: JSON.stringify(event.changes),
      previous_values: JSON.stringify(event.previousValues),
      created_at: new Date(),
    })

    loggerService.debug('Created task version snapshot', {
      taskId: event.task.id,
      changedBy: event.updatedBy,
      changedFields: Object.keys(event.changes),
    })
  } catch (error) {
    loggerService.error('Failed to create task version snapshot', {
      taskId: event.task.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

/**
 * Task Status Changed → Auto-complete assignments & Create review session
 *
 * When task status changes to a status with category 'done':
 * 1. Mark all active assignments as 'completed'
 * 2. Auto-create review sessions for each completed assignment
 */
emitter.on('task:status:changed', async (event: TaskStatusChangedEvent) => {
  if (event.newStatusCategory !== 'done') return

  try {
    const { default: TaskAssignment } = await import('#models/task_assignment')
    const { default: ReviewSession } = await import('#models/review_session')

    // Find all active assignments for this task
    const activeAssignments = await TaskAssignment.query()
      .where('task_id', event.task.id)
      .where('assignment_status', 'active')

    for (const assignment of activeAssignments) {
      // Mark assignment as completed
      assignment.assignment_status = 'completed'
      await assignment.save()

      // Check if review session already exists
      const existingSession = await ReviewSession.query()
        .where('task_assignment_id', assignment.id)
        .first()

      if (!existingSession) {
        // Auto-create review session
        await ReviewSession.create({
          task_assignment_id: assignment.id,
          reviewee_id: assignment.assignee_id,
          status: 'pending',
          manager_review_completed: false,
          peer_reviews_count: 0,
          required_peer_reviews: 2,
        })

        loggerService.info('Auto-created review session for completed assignment', {
          taskId: event.task.id,
          assignmentId: assignment.id,
          assigneeId: assignment.assignee_id,
        })
      }
    }

    if (activeAssignments.length > 0) {
      loggerService.info('Task completed — assignments updated & review sessions created', {
        taskId: event.task.id,
        assignmentsCompleted: activeAssignments.length,
      })
    }
  } catch (error) {
    loggerService.error('Failed to auto-trigger review session on task completion', {
      taskId: event.task.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
