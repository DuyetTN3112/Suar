import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import TaskApplication from '#models/task_application'
import TaskAssignment from '#models/task_assignment'
import type { ProcessApplicationDTO } from '#actions/tasks/dtos/task_application_dtos'
import CacheService from '#services/cache_service'
import { ApplicationStatus, AssignmentStatus } from '#constants/task_constants'
import ForbiddenException from '#exceptions/forbidden_exception'

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
  TaskApplication
> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: ProcessApplicationDTO): Promise<TaskApplication> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUser().id

      // Get application with task
      const application = await TaskApplication.query({ client: trx })
        .where('id', dto.application_id)
        .where('application_status', ApplicationStatus.PENDING)
        .preload('task')
        .preload('applicant')
        .firstOrFail()

      const task = application.task

      // Verify user has permission (task creator or organization admin)
      // For now, just check if user is task creator
      if (task.creator_id !== userId) {
        throw new ForbiddenException('You do not have permission to process this application')
      }

      const oldStatus = application.application_status

      if (dto.action === 'approve') {
        // Update application status
        application.application_status = ApplicationStatus.APPROVED
        application.reviewed_by = userId
        application.reviewed_at = DateTime.now()

        await application.useTransaction(trx).save()

        // Create assignment
        await TaskAssignment.create(
          {
            task_id: task.id,
            assignee_id: application.applicant_id,
            assigned_by: userId,
            assignment_type: dto.assignment_type,
            assignment_status: AssignmentStatus.ACTIVE,
            estimated_hours: dto.estimated_hours,
            progress_percentage: 0,
          },
          { client: trx }
        )

        // Update task assigned_to
        task.assigned_to = application.applicant_id
        await task.useTransaction(trx).save()

        // Reject other pending applications
        await TaskApplication.query({ client: trx })
          .where('task_id', task.id)
          .where('application_status', ApplicationStatus.PENDING)
          .whereNot('id', application.id)
          .update({
            application_status: ApplicationStatus.REJECTED,
            reviewed_by: userId,
            reviewed_at: new Date(),
            rejection_reason: 'Another applicant was selected',
          })
      } else {
        // Reject application
        application.application_status = ApplicationStatus.REJECTED
        application.reviewed_by = userId
        application.reviewed_at = DateTime.now()
        application.rejection_reason = dto.rejection_reason

        await application.useTransaction(trx).save()
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

      return application
    })
  }
}
