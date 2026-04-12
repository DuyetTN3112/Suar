import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import type { DeleteTaskStatusDTO } from '../dtos/request/task_status_dtos.js'

import CreateAuditLog from '#actions/common/create_audit_log'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { canDeleteStatus } from '#domain/tasks/task_status_rules'
import BusinessLogicException from '#exceptions/business_logic_exception'
import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
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
      const count = await TaskRepository.countByTaskStatusId(dto.status_id, trx)

      if (status.category === 'done' && count > 0) {
        if (await ReviewSessionRepository.hasAnyForTasksWithStatus(dto.status_id, trx)) {
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
      status.deleted_at = DateTime.now()
      await TaskStatusRepository.save(status, trx)

      await new CreateAuditLog(this.execCtx).handle({
        user_id: userId,
        action: AuditAction.DELETE,
        entity_type: EntityType.TASK_STATUS,
        entity_id: status.id,
        old_values: status.toJSON(),
      })

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
