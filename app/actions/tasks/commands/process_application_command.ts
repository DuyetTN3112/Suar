import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseCommand } from '#actions/tasks/base_command'
import type { ProcessApplicationDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import { ApplicationStatus, AssignmentStatus } from '#constants/task_constants'
import { canProcessApplication } from '#domain/tasks/task_assignment_rules'
import NotFoundException from '#exceptions/not_found_exception'
import CacheService from '#infra/cache/cache_service'
import TaskApplicationRepository from '#infra/tasks/repositories/task_application_repository'
import TaskAssignmentRepository from '#infra/tasks/repositories/task_assignment_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { TaskApplicationRecord } from '#types/task_records'

/**
 * ProcessApplicationCommand
 *
 * Allows project owner/manager to approve or reject a task application.
 * On approval:
 * - Creates TaskAssignment record
 * - Updates task's assigned_to
 * - Notifies applicant
 * On rejection:
 * - Records rejection reason
 * - Notifies applicant
 */
export default class ProcessApplicationCommand extends BaseCommand<
  ProcessApplicationDTO,
  TaskApplicationRecord
> {
  async handle(dto: ProcessApplicationDTO): Promise<TaskApplicationRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Get application with task
      const application = await TaskApplicationRepository.findPendingByIdWithTaskAndApplicant(
        dto.application_id,
        trx
      )

      if (!application) {
        throw new NotFoundException('Application không tồn tại hoặc không còn chờ xử lý')
      }

      const task = application.task

      if (!task) {
        throw new NotFoundException('Application task context is missing')
      }

      // Verify user has permission (task creator)
      const existingActiveAssignment = await TaskAssignmentRepository.findActiveByTask(task.id, trx)

      enforcePolicy(
        canProcessApplication({
          actorId: userId,
          taskCreatorId: task.creator_id,
          action: dto.action,
          isTaskAlreadyAssigned: task.assigned_to !== null || existingActiveAssignment !== null,
        })
      )

      const oldStatus = application.application_status

      if (dto.action === 'approve') {
        await TaskApplicationRepository.updateStatus(
          application.id,
          {
            application_status: ApplicationStatus.APPROVED,
            reviewed_by: userId,
            reviewed_at: DateTime.now(),
          },
          trx
        )

        // Create assignment
        await TaskAssignmentRepository.create(
          {
            task_id: task.id,
            assignee_id: application.applicant_id,
            assigned_by: userId,
            assignment_type: dto.assignment_type,
            assignment_status: AssignmentStatus.ACTIVE,
            estimated_hours: dto.estimated_hours,
            progress_percentage: 0,
          },
          trx
        )

        // Update task assigned_to
        await TaskRepository.updateTask(task.id, { assigned_to: application.applicant_id }, trx)

        // Reject other pending applications
        await TaskApplicationRepository.rejectOtherPendingByTask(
          task.id,
          application.id,
          userId,
          'Another applicant was selected',
          trx
        )
      } else {
        await TaskApplicationRepository.updateStatus(
          application.id,
          {
            application_status: ApplicationStatus.REJECTED,
            reviewed_by: userId,
            reviewed_at: DateTime.now(),
            rejection_reason: dto.rejection_reason,
          },
          trx
        )
      }

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'process_application',
          entity_type: 'task_application',
          entity_id: application.id,
          old_values: { status: oldStatus },
          new_values: {
            status: application.application_status,
            action: dto.action,
            rejection_reason: dto.rejection_reason,
          },
        })
      }

      return {
        application: {
          ...application,
          application_status:
            dto.action === 'approve' ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED,
          reviewed_by: userId,
          rejection_reason:
            dto.action === 'reject' ? dto.rejection_reason : application.rejection_reason,
        },
        taskCachePattern: `task:${task.id}:*`,
        applicantCachePattern: `user:${application.applicant_id}:*`,
        applicationReviewedEvent: {
          applicationId: application.id,
          taskId: task.id,
          applicantId: application.applicant_id,
          reviewedBy: userId,
          status: dto.action === 'approve' ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED,
        },
      }
    })

    await CacheService.deleteByPattern(result.taskCachePattern)
    await CacheService.deleteByPattern(result.applicantCachePattern)
    void emitter.emit('task:application:reviewed', result.applicationReviewedEvent)

    return result.application
  }
}
