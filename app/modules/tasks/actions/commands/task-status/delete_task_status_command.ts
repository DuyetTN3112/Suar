import type { DeleteTaskStatusDTO } from '../../dtos/request/task_status_dtos.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/commands/internal/settle_task_post_commit_effects'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskStatusReviewReader } from '#modules/tasks/actions/ports/outbound/task_status_review_reader'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canDeleteStatus } from '#modules/tasks/domain/task-status/task_status_rules'

/**
 * Command: Soft-delete a task status definition.
 *
 * Business rules:
 * - System statuses cannot be deleted
 * - Statuses with tasks assigned cannot be deleted
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class DeleteTaskStatusCommand extends BaseCommand<DeleteTaskStatusDTO, void> {
  constructor(
    protected override execCtx: TaskActionContext,
    private readonly reviewReader: TaskStatusReviewReader,
    private readonly cache: TaskCachePort,
    private readonly taskExternalDependencies: TaskExternalDependencies
  ) {
    super(execCtx, taskExternalDependencies.transactions)
  }

  async handle(dto: DeleteTaskStatusDTO): Promise<void> {
    return this.execute(dto)
  }

  async execute(dto: DeleteTaskStatusDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    await this.taskExternalDependencies.transactions.run(async (trx) => {
      // ── FETCH ──────────────────────────────────────────────────────────
      const status = await this.taskExternalDependencies.lifecycle.lockStatus(
        dto.status_id,
        dto.organization_id,
        trx,
        dto.project_id ?? undefined
      )

      if (!status) {
        throw new NotFoundException('Trạng thái task không tồn tại')
      }

      // Count tasks using this status
      const count = await this.taskExternalDependencies.lifecycle.countTasksByStatus(
        dto.status_id,
        trx
      )

      if (status.category === 'done' && count > 0) {
        if (
          await this.reviewReader.hasAnyReviewForTasksWithStatus(
            dto.status_id,
            trx
          )
        ) {
          throw new BusinessLogicException(
            'Không thể xóa trạng thái hoàn thành vì đã có task gắn review'
          )
        }
      }

      // ── DECIDE ─────────────────────────────────────────────────────────
      enforcePolicy(
        canDeleteStatus({
          isSystem: status.is_system,
          taskCount: count,
        })
      )

      // ── PERSIST (soft delete) ──────────────────────────────────────────
      await this.taskExternalDependencies.lifecycle.softDeleteStatus(
        status.id,
        status.organization_id,
        trx,
        dto.project_id ?? undefined
      )

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.DELETE,
          entity_type: EntityType.TASK_STATUS,
          entity_id: status.id,
          old_values: { ...status },
        },
        this.execCtx,
        { trx, critical: true }
      )
    })

    await settleTaskPostCommitEffects({
      operation: 'task_status.delete',
      context: {
        taskStatusId: dto.status_id,
        organizationId: dto.organization_id,
        projectId: dto.project_id,
      },
      effects: [
        {
          name: 'cache.metadata.invalidate_now',
          run: () =>
            this.cache.invalidateAfterTaskCollectionMetadataChanged(dto.organization_id),
        },
      ],
    })
  }
}
