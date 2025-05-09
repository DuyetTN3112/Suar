import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import TaskApplication from '#models/task_application'
import type { WithdrawApplicationDTO } from '#actions/tasks/dtos/task_application_dtos'
import CacheService from '#services/cache_service'

/**
 * WithdrawApplicationCommand
 *
 * Allows an applicant to withdraw their application.
 * Can only withdraw pending applications.
 */
export default class WithdrawApplicationCommand extends BaseCommand<WithdrawApplicationDTO> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: WithdrawApplicationDTO): Promise<void> {
    await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUser().id

      // Get application
      const application = await TaskApplication.query({ client: trx })
        .where('id', dto.application_id)
        .where('applicant_id', userId)
        .where('application_status', 'pending')
        .preload('task')
        .firstOrFail()

      const task = application.task

      // Update status
      application.application_status = 'withdrawn'
      await application.useTransaction(trx).save()

      // Decrement task's application count
      if (task.external_applications_count > 0) {
        task.external_applications_count -= 1
        await task.useTransaction(trx).save()
      }

      // Log audit
      await this.logAudit('withdraw_application', 'task_application', application.id, null, {
        task_id: task.id,
        task_title: task.title,
      })

      // Invalidate cache
      await CacheService.deleteByPattern(`task:${task.id}:*`)
    })
  }
}
