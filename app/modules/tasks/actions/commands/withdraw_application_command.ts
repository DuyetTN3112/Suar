import emitter from '@adonisjs/core/services/emitter'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { WithdrawApplicationDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'

/**
 * WithdrawApplicationCommand
 *
 * Allows an applicant to withdraw their application.
 * Can only withdraw pending applications.
 */
export default class WithdrawApplicationCommand extends BaseCommand<WithdrawApplicationDTO> {
  constructor(
    execCtx: TaskActionContext,
    private cache: TaskCachePort
  ) {
    super(execCtx)
  }

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

      const task = await detailQueries.findActiveOrFailAsRecord(application.task_id, trx)

      // Update status
      await TaskApplicationRepository.updateStatus(
        application.id,
        { application_status: ApplicationStatus.WITHDRAWN },
        trx
      )

      // Decrement task's application count
      const currentApplicationCount = task.external_applications_count ?? 0
      if (currentApplicationCount > 0) {
        await taskMutations.updateTask(
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
        taskId: task.id,
        auditEvent: {
          userId,
          action: 'withdraw_application',
          entityType: 'task_application',
          entityId: application.id,
          newValues: { task_id: task.id },
        },
      }
    })

    await this.cache.invalidateAfterTaskApplicationChanged(result.taskId)
    void emitter.emit('audit:log', result.auditEvent)
  }
}
