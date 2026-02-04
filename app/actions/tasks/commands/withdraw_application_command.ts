import emitter from '@adonisjs/core/services/emitter'

import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/tasks/base_command'
import type { WithdrawApplicationDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import NotFoundException from '#exceptions/not_found_exception'
import CacheService from '#infra/cache/cache_service'
import TaskApplicationRepository from '#infra/tasks/repositories/task_application_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import { ApplicationStatus } from '#modules/tasks/constants/task_constants'

/**
 * WithdrawApplicationCommand
 *
 * Allows an applicant to withdraw their application.
 * Can only withdraw pending applications.
 */
export default class WithdrawApplicationCommand extends BaseCommand<WithdrawApplicationDTO> {
  async handle(dto: WithdrawApplicationDTO): Promise<void> {
    const result = await this.executeInTransaction(async (trx) => {
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

      const task = await TaskRepository.findActiveOrFail(application.task_id, trx)

      // Update status
      await TaskApplicationRepository.updateStatus(
        application.id,
        { application_status: ApplicationStatus.WITHDRAWN },
        trx
      )

      // Decrement task's application count
      const currentApplicationCount = task.external_applications_count ?? 0
      if (currentApplicationCount > 0) {
        await TaskRepository.updateTask(
          task.id,
          { external_applications_count: currentApplicationCount - 1 },
          trx
        )
      }

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'withdraw_application',
          entity_type: 'task_application',
          entity_id: application.id,
          old_values: null,
          new_values: {
            task_id: task.id,
            task_title: task.title,
          },
        })
      }

      return {
        cachePattern: `task:${task.id}:*`,
        auditEvent: {
          userId,
          action: 'withdraw_application',
          entityType: 'task_application',
          entityId: application.id,
          newValues: { task_id: task.id },
        },
      }
    })

    await CacheService.deleteByPattern(result.cachePattern)
    void emitter.emit('audit:log', result.auditEvent)
  }
}
