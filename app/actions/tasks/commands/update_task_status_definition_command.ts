import db from '@adonisjs/lucid/services/db'

import type { UpdateTaskStatusDTO } from '../dtos/request/task_status_dtos.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { canEditStatus } from '#domain/tasks/task_status_rules'
import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskStatusRecord } from '#types/task_records'

/**
 * Command: Update an existing task status definition.
 *
 * Business rules:
 * - System statuses cannot have their category changed
 * - Slug must remain unique within organization
 * - If setting is_default=true, unset other defaults
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class UpdateTaskStatusDefinitionCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: UpdateTaskStatusDTO): Promise<TaskStatusRecord> {
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

      // ── DECIDE ─────────────────────────────────────────────────────────
      enforcePolicy(
        canEditStatus({
          isSystem: status.is_system,
          changingCategory: dto.isChangingCategory,
        })
      )

      // Check slug uniqueness if changing
      if (dto.slug && dto.slug !== status.slug) {
        const slugExists = await TaskStatusRepository.slugExists(
          dto.organization_id,
          dto.slug,
          dto.status_id,
          trx
        )
        if (slugExists) {
          throw new ConflictException(`Slug '${dto.slug}' đã tồn tại trong tổ chức này`)
        }
      }

      // ── PERSIST ────────────────────────────────────────────────────────
      const oldValues = { ...status }

      const updateData: Record<string, unknown> = {}
      if (dto.name !== undefined) updateData.name = dto.name
      if (dto.slug !== undefined) updateData.slug = dto.slug
      if (dto.category !== undefined) updateData.category = dto.category
      if (dto.color !== undefined) updateData.color = dto.color
      if (dto.icon !== undefined) updateData.icon = dto.icon
      if (dto.description !== undefined) updateData.description = dto.description
      if (dto.sort_order !== undefined) updateData.sort_order = dto.sort_order

      // Handle is_default: if setting to true, unset others first
      if (dto.is_default === true && !status.is_default) {
        await TaskStatusRepository.unsetDefaults(dto.organization_id, trx)
        updateData.is_default = true
      } else if (dto.is_default === false) {
        updateData.is_default = false
      }

      const updatedStatus = await TaskStatusRepository.update(
        status.id,
        status.organization_id,
        updateData,
        trx
      )

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.UPDATE,
          entity_type: EntityType.TASK_STATUS,
          entity_id: status.id,
          old_values: oldValues,
          new_values: updatedStatus,
        },
        this.execCtx
      )

      await trx.commit()
      return updatedStatus
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
