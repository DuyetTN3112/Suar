import TaskStatus from '#models/task_status'
import TaskStatusRepository from '#repositories/task_status_repository'
import AuditLog from '#models/mongo/audit_log'
import type { UpdateTaskStatusDTO } from '../dtos/task_status_dtos.js'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { canEditStatus } from '#domain/tasks/task_status_rules'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ConflictException from '#exceptions/conflict_exception'

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

  async execute(dto: UpdateTaskStatusDTO): Promise<TaskStatus> {
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
      const oldValues = status.toJSON()

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

      status.merge(updateData)
      await status.save()

      await AuditLog.create({
        user_id: userId,
        action: AuditAction.UPDATE,
        entity_type: EntityType.TASK_STATUS,
        entity_id: status.id,
        old_values: oldValues,
        new_values: status.toJSON(),
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

      await trx.commit()
      return status
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
