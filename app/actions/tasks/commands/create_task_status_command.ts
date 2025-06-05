import TaskStatus from '#models/task_status'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import AuditLog from '#models/mongo/audit_log'
import type { CreateTaskStatusDTO } from '../dtos/request/task_status_dtos.js'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ConflictException from '#exceptions/conflict_exception'

/**
 * Command: Create a new task status for an organization.
 *
 * Business rules:
 * - Slug must be unique within organization
 * - If is_default=true, unset other defaults
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class CreateTaskStatusCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: CreateTaskStatusDTO): Promise<TaskStatus> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const slugExists = await TaskStatusRepository.slugExists(
        dto.organization_id,
        dto.slug,
        undefined,
        trx
      )

      // ── DECIDE ─────────────────────────────────────────────────────────
      if (slugExists) {
        throw new ConflictException(`Slug '${dto.slug}' đã tồn tại trong tổ chức này`)
      }

      // ── PERSIST ────────────────────────────────────────────────────────
      const status = await TaskStatus.create(
        {
          organization_id: dto.organization_id,
          name: dto.name,
          slug: dto.slug,
          category: dto.category,
          color: dto.color,
          icon: dto.icon || null,
          description: dto.description || null,
          sort_order: dto.sort_order,
          is_default: false,
          is_system: false,
        },
        { client: trx }
      )

      await AuditLog.create({
        user_id: userId,
        action: AuditAction.CREATE,
        entity_type: EntityType.TASK_STATUS,
        entity_id: status.id,
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
