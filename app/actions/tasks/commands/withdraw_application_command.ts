import { BaseCommand } from '#actions/shared/base_command'
import type { WithdrawApplicationDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import { ApplicationStatus } from '#constants/task_constants'
import TaskApplicationRepository from '#infra/tasks/repositories/task_application_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import NotFoundException from '#exceptions/not_found_exception'

/**
 * WithdrawApplicationCommand
 *
 * Allows an applicant to withdraw their application.
 * Can only withdraw pending applications.
 */
export default class WithdrawApplicationCommand extends BaseCommand<WithdrawApplicationDTO> {
  async handle(dto: WithdrawApplicationDTO): Promise<void> {
    await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Get application
      const application = await TaskApplicationRepository.findPendingOwnedByApplicantWithTask(
        dto.application_id,
        userId,
        trx
      )

      if (!application) {
        throw new NotFoundException('Application không tồn tại hoặc không thể rút')
      }

      const task = application.task

      // Update status
      application.application_status = ApplicationStatus.WITHDRAWN
      await TaskApplicationRepository.save(application, trx)

      // Decrement task's application count
      if (task.external_applications_count > 0) {
        task.external_applications_count -= 1
        await TaskRepository.save(task, trx)
      }

      // Log audit
      await this.logAudit('withdraw_application', 'task_application', application.id, null, {
        task_id: task.id,
        task_title: task.title,
      })

      // Invalidate cache
      await CacheService.deleteByPattern(`task:${task.id}:*`)

      // Emit audit event
      void emitter.emit('audit:log', {
        userId,
        action: 'withdraw_application',
        entityType: 'task_application',
        entityId: application.id,
        newValues: { task_id: task.id },
      })
    })
  }
}
