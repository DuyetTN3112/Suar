import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import TaskApplication from '#models/task_application'
import Task from '#models/task'
import type { ApplyForTaskDTO } from '#actions/tasks/dtos/task_application_dtos'
import CacheService from '#services/cache_service'
import { ApplicationStatus } from '#constants/task_constants'

/**
 * ApplyForTaskCommand
 *
 * Allows a freelancer to apply for a public task.
 * Validates:
 * - Task exists and is public listing
 * - User hasn't already applied
 * - User is not the task creator
 */
export default class ApplyForTaskCommand extends BaseCommand<ApplyForTaskDTO, TaskApplication> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: ApplyForTaskDTO): Promise<TaskApplication> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUser().id

      // Verify task exists and is a public listing
      const task = await Task.query({ client: trx })
        .where('id', dto.task_id)
        .whereNull('deleted_at')
        .where('is_public_listing', true)
        .firstOrFail()

      // Cannot apply to own task
      if (task.creator_id === userId) {
        throw new Error('Cannot apply to your own task')
      }

      // Check if already applied
      const existingApplication = await TaskApplication.query({ client: trx })
        .where('task_id', dto.task_id)
        .where('applicant_id', userId)
        .whereNot('application_status', ApplicationStatus.WITHDRAWN)
        .first()

      if (existingApplication) {
        throw new Error('You have already applied to this task')
      }

      // Create application
      const application = await TaskApplication.create(
        {
          task_id: dto.task_id,
          applicant_id: userId,
          application_status: ApplicationStatus.PENDING,
          application_source: dto.application_source,
          message: dto.message,
          expected_rate: dto.expected_rate,
          portfolio_links: dto.portfolio_links,
        },
        { client: trx }
      )

      // Update task's application count
      task.external_applications_count = (task.external_applications_count || 0) + 1
      await task.useTransaction(trx).save()

      // Log audit
      await this.logAudit('apply_task', 'task_application', application.id, null, {
        task_id: dto.task_id,
        task_title: task.title,
        expected_rate: dto.expected_rate,
      })

      // Invalidate cache
      await CacheService.deleteByPattern(`task:${dto.task_id}:*`)

      return application
    })
  }
}
