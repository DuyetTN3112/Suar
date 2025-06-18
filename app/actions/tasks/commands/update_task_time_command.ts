import Task from '#models/task'
import UserRepository from '#infra/users/repositories/user_repository'
import AuditLog from '#models/mongo/audit_log'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type UpdateTaskTimeDTO from '../dtos/request/update_task_time_dto.js'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canUpdateTaskTime } from '#domain/tasks/task_permission_policy'

/**
 * Command để cập nhật thời gian của task
 *
 * Business Rules:
 * - Update estimated_time và/hoặc actual_time
 * - Set updated_by
 * - Audit log đầy đủ
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class UpdateTaskTimeCommand {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command để update time
   */
  async execute(dto: UpdateTaskTimeDTO): Promise<Task> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Start transaction
    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const task = await Task.query({ client: trx })
        .where('id', dto.task_id)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      const [systemRole, orgRole] = await Promise.all([
        UserRepository.getSystemRoleName(userId),
        OrganizationUserRepository.getMemberRoleName(
          task.organization_id,
          userId,
          undefined,
          false
        ),
      ])

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      enforcePolicy(
        canUpdateTaskTime({
          actorId: userId,
          actorSystemRole: systemRole,
          actorOrgRole: orgRole,
          actorProjectRole: null,
          taskCreatorId: task.creator_id,
          taskAssignedTo: task.assigned_to,
          taskOrganizationId: task.organization_id,
          taskProjectId: task.project_id,
          isActiveAssignee: false,
        })
      )

      // ── PERSIST ────────────────────────────────────────────────────────
      const oldValues = {
        estimated_time: task.estimated_time,
        actual_time: task.actual_time,
      }

      task.merge(dto.toObject())
      task.updated_by = userId
      await task.save()

      await AuditLog.create({
        user_id: userId,
        action: AuditAction.UPDATE_TIME,
        entity_type: EntityType.TASK,
        entity_id: dto.task_id,
        old_values: oldValues,
        new_values: {
          estimated_time: task.estimated_time,
          actual_time: task.actual_time,
        },
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

      await trx.commit()

      // Invalidate task cache
      await CacheService.deleteByPattern(`task:${dto.task_id}:*`)

      // Emit domain event
      void emitter.emit('task:updated', {
        task,
        updatedBy: userId,
        changes: {
          estimated_time: task.estimated_time,
          actual_time: task.actual_time,
        },
        previousValues: oldValues,
      })

      // Load relations
      await task.load((loader) => {
        loader.load('assignee').load('creator').load('updater')
      })

      return task
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
