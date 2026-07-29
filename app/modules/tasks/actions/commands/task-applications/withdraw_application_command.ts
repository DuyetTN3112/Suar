import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { WithdrawApplicationDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/commands/internal/settle_task_post_commit_effects'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
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
    private cache: TaskCachePort,
    private readonly taskExternalDependencies: TaskExternalDependencies
  ) {
    super(execCtx, taskExternalDependencies.transactions)
  }

  async handle(dto: WithdrawApplicationDTO): Promise<void> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Get application
      const application =
        await this.taskExternalDependencies.lifecycle.findPendingApplicationOwnedByApplicant(
        dto.application_id,
        userId,
        trx
      )

      if (!application) {
        throw new NotFoundException('Application không tồn tại hoặc không thể rút')
      }

      const task = await this.taskExternalDependencies.lifecycle.findActiveTask(
        application.task_id,
        trx
      )

      // Update status
      await this.taskExternalDependencies.lifecycle.updateApplicationStatus(
        application.id,
        {
          application_status: ApplicationStatus.WITHDRAWN,
          reviewed_at: DateTime.now(),
        },
        trx
      )

      // Decrement task's application count
      const currentApplicationCount = task.external_applications_count ?? 0
      if (currentApplicationCount > 0) {
        await this.taskExternalDependencies.lifecycle.updateTask(
          task.id,
          { external_applications_count: currentApplicationCount - 1 },
          trx
        )
      }

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'withdraw_application',
            critical: true,
            entity_type: 'task_application',
            entity_id: application.id,
            old_values: null,
            new_values: {
              task_id: task.id,
              task_title: task.title,
            },
          },
          trx
        )
      }

      return {
        taskId: task.id,
        organizationId: task.organization_id,
      }
    })

    await settleTaskPostCommitEffects({
      operation: 'task.application.withdraw',
      context: {
        taskId: result.taskId,
        applicationId: dto.application_id,
        actorId: this.execCtx.userId,
      },
      effects: [
        {
          name: 'cache.invalidate_after_application_change',
          run: () =>
            this.cache.invalidateAfterTaskApplicationChanged(
              result.taskId,
              result.organizationId,
              this.execCtx.userId ?? undefined
            ),
        },
      ],
    })
  }
}
