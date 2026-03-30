import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import type { ProcessApplicationDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import { ApplicationStatus, AssignmentStatus } from '#constants/task_constants'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canProcessApplication } from '#domain/tasks/task_assignment_rules'
import TaskApplicationRepository from '#infra/tasks/repositories/task_application_repository'
import TaskAssignmentRepository from '#infra/tasks/repositories/task_assignment_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import NotFoundException from '#exceptions/not_found_exception'

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
  import('#models/task_application').default
> {
  async handle(dto: ProcessApplicationDTO): Promise<import('#models/task_application').default> {
    return await this.executeInTransaction(async (trx) => {
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
        // Update application status
        application.application_status = ApplicationStatus.APPROVED
        application.reviewed_by = userId
        application.reviewed_at = DateTime.now()

        await TaskApplicationRepository.save(application, trx)

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
        task.assigned_to = application.applicant_id
        await TaskRepository.save(task, trx)

        // Reject other pending applications
        await TaskApplicationRepository.rejectOtherPendingByTask(
          task.id,
          application.id,
          userId,
          'Another applicant was selected',
          trx
        )
      } else {
        // Reject application
        application.application_status = ApplicationStatus.REJECTED
        application.reviewed_by = userId
        application.reviewed_at = DateTime.now()
        application.rejection_reason = dto.rejection_reason

        await TaskApplicationRepository.save(application, trx)
      }

      // Log audit
      await this.logAudit(
        'process_application',
        'task_application',
        application.id,
        { status: oldStatus },
        {
          status: application.application_status,
          action: dto.action,
          rejection_reason: dto.rejection_reason,
        }
      )

      // Invalidate cache
      await CacheService.deleteByPattern(`task:${task.id}:*`)
      await CacheService.deleteByPattern(`user:${application.applicant_id}:*`)

      // Emit domain event
      void emitter.emit('task:application:reviewed', {
        applicationId: application.id,
        taskId: task.id,
        applicantId: application.applicant_id,
        reviewedBy: userId,
        status: application.application_status,
      })

      return application
    })
  }
}
