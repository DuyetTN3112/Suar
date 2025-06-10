import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import { DateTime } from 'luxon'
import type {
  OrganizationCreatedEvent,
  ProjectCreatedEvent,
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
    let activeAssignments = await TaskAssignment.query()
      .where('task_id', event.task.id)
      .where('assignment_status', 'active')

    // Fallback path: legacy/internal tasks may only have task.assigned_to,
    // but no task_assignments rows yet.
    if (activeAssignments.length === 0 && event.task.assigned_to) {
      const existingAssignment = await TaskAssignment.query()
        .where('task_id', event.task.id)
        .where('assignee_id', event.task.assigned_to)
        .whereIn('assignment_status', ['active', 'completed'])
        .orderBy('assigned_at', 'desc')
        .first()

      if (!existingAssignment) {
        const fallbackAssignment = await TaskAssignment.create({
          task_id: event.task.id,
          assignee_id: event.task.assigned_to,
          assigned_by: event.changedBy,
          assignment_type: 'member',
          assignment_status: 'completed',
          progress_percentage: 100,
          assigned_at: DateTime.now(),
          completed_at: DateTime.now(),
        })

        activeAssignments = [fallbackAssignment]
      } else {
        activeAssignments = [existingAssignment]
      }
    }

    for (const assignment of activeAssignments) {
      // Mark assignment as completed
      if (assignment.assignment_status !== 'completed') {
        assignment.assignment_status = 'completed'
        assignment.completed_at = DateTime.now()
        await assignment.save()
      }

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
    } else {
      loggerService.warn('Task moved to done but no assignee/assignment found for review creation', {
        taskId: event.task.id,
      })
    }
  } catch (error) {
    loggerService.error('Failed to auto-trigger review session on task completion', {
      taskId: event.task.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
