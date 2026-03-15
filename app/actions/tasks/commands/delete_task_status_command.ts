import { DateTime } from 'luxon'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import Task from '#models/task'
import AuditLog from '#models/mongo/audit_log'
import type { DeleteTaskStatusDTO } from '../dtos/request/task_status_dtos.js'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { canDeleteStatus } from '#domain/tasks/task_status_rules'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'

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
      const taskCount = await Task.query({ client: trx })
        .where('task_status_id', dto.status_id)
        .whereNull('deleted_at')
        .count('* as total')
        .first()

      const count = Number(taskCount?.$extras.total ?? 0)

      // ── DECIDE ─────────────────────────────────────────────────────────
      enforcePolicy(
        canDeleteStatus({
          isSystem: status.is_system,
          taskCount: count,
        })
      )

      // ── PERSIST (soft delete) ──────────────────────────────────────────
      status.deleted_at = DateTime.now()
      await status.save()

      await AuditLog.create({
        user_id: userId,
        action: AuditAction.DELETE,
        entity_type: EntityType.TASK_STATUS,
        entity_id: status.id,
        old_values: status.toJSON(),
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
