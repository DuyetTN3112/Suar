import db from '@adonisjs/lucid/services/db'


import type { DeleteTaskStatusDTO } from '../dtos/request/task_status_dtos.js'


import { DefaultTaskDependencies } from '#bootstrap/task_command_factory'
import BusinessLogicException from '#exceptions/business_logic_exception'
import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { auditPublicApi } from '#modules/audit/actions/public_api'
import { AuditAction, EntityType } from '#modules/audit/constants/audit_constants'
import { enforcePolicy } from '#modules/authorization/actions/public_api'
import { canDeleteStatus } from '#modules/tasks/domain/task_status_rules'
import * as aggregateQueries from '#modules/tasks/infra/repositories/read/aggregate_queries'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import type { ExecutionContext } from '#types/execution_context'

/**
 * Command: Soft-delete a task status definition.
 *
 * Business rules:
 * - System statuses cannot be deleted
 * - Statuses with tasks assigned cannot be deleted
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class DeleteTaskStatusCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: DeleteTaskStatusDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const status = await TaskStatusRepository.findByIdAndOrgForUpdate(
        dto.status_id,
        dto.organization_id,
        trx
      )

      if (!status) {
        throw new NotFoundException('Trạng thái task không tồn tại')
      }

      // Count tasks using this status
      const count = await aggregateQueries.countByTaskStatusId(dto.status_id, trx)

      if (status.category === 'done' && count > 0) {
        if (
          await DefaultTaskDependencies.review.hasAnyReviewForTasksWithStatus(dto.status_id, trx)
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
      await TaskStatusRepository.softDelete(status.id, status.organization_id, trx)

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.DELETE,
          entity_type: EntityType.TASK_STATUS,
          entity_id: status.id,
          old_values: { ...status },
        },
        this.execCtx
      )

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
