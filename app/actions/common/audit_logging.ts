import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'
import { AuditAction, EntityType } from '#constants/audit_constants'

// Re-export for backward compatibility
export { EntityType, AuditAction as ActionType }

interface AuditLogData {
  action: string
  entity_type: string
  entity_id: number
  user_id?: number
  old_values?: object | null
  new_values?: object | null
  metadata?: unknown
}

interface EntityWithId {
  id?: number | null
  [key: string]: unknown
}

export default class AuditLogging {
  constructor(private ctx: HttpContext) {}

  async log({
    action,
    entity_type,
    entity_id,
    user_id,
    old_values = null,
    new_values = null,
  }: AuditLogData) {
    const effectiveUserId = user_id || this.ctx.auth.user?.id
    if (!effectiveUserId) {
      throw new Error('user_id is required for audit logging')
    }
    // Tạo audit log
    await AuditLog.create({
      user_id: effectiveUserId,
      action,
      entity_type,
      entity_id: entity_id,
      old_values: old_values,
      new_values: new_values,
      ip_address: this.ctx.request.ip() || null,
      user_agent: this.ctx.request.header('user-agent') || null,
      created_at: DateTime.now(),
    })
  }

  async logCreation(entity_type: string, entity: EntityWithId) {
    const user = this.ctx.auth.user
    return await AuditLog.create({
      user_id: user?.id || null,
      action: AuditAction.CREATE,
      entity_type,
      entity_id: entity.id || null,
      new_values: entity,
      ip_address: this.ctx.request.ip() || null,
      user_agent: this.ctx.request.header('user-agent') || null,
      old_values: null,
    })
  }

  async logUpdate(entity_type: string, oldData: EntityWithId, newData: EntityWithId) {
    const user = this.ctx.auth.user
    return await AuditLog.create({
      user_id: user?.id || null,
      action: AuditAction.UPDATE,
      entity_type,
      entity_id: newData.id || null,
      old_values: oldData,
      new_values: newData,
      ip_address: this.ctx.request.ip() || null,
      user_agent: this.ctx.request.header('user-agent') || null,
    })
  }

  /**
   * Ghi log cho hành động xóa
   */
  async logDeletion(entity_type: string, entity: EntityWithId) {
    const user = this.ctx.auth.user
    return await AuditLog.create({
      user_id: user?.id || null,
      action: AuditAction.DELETE,
      entity_type,
      entity_id: entity.id || null,
      old_values: entity,
      new_values: null,
      ip_address: this.ctx.request.ip() || null,
      user_agent: this.ctx.request.header('user-agent') || null,
    })
  }
}
