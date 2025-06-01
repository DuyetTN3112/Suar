import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'
import { AuditAction, EntityType } from '#constants/audit_constants'
import type { DatabaseId } from '#types/database'
import BusinessLogicException from '#exceptions/business_logic_exception'
import type { ExecutionContext } from '#types/execution_context'

// Re-export for backward compatibility
export { EntityType, AuditAction as ActionType }

interface AuditLogData {
  action: string
  entity_type: string
  entity_id: DatabaseId
  user_id?: DatabaseId
  old_values?: object | null
  new_values?: object | null
  metadata?: unknown
}

interface EntityWithId {
  id?: DatabaseId | null
  [key: string]: unknown
}

export default class AuditLogging {
  constructor(private execCtx: ExecutionContext) {}

  async log({
    action,
    entity_type,
    entity_id,
    user_id,
    old_values = null,
    new_values = null,
  }: AuditLogData) {
    const effectiveUserId = user_id || this.execCtx.userId
    if (!effectiveUserId) {
      throw new BusinessLogicException('user_id is required for audit logging')
    }
    // Tạo audit log
    await AuditLog.create({
      user_id: effectiveUserId,
      action,
      entity_type,
      entity_id: entity_id,
      old_values: old_values,
      new_values: new_values,
      ip_address: this.execCtx.ip || null,
      user_agent: this.execCtx.userAgent || null,
      created_at: DateTime.now(),
    })
  }

  async logCreation(entity_type: string, entity: EntityWithId) {
    return await AuditLog.create({
      user_id: this.execCtx.userId || null,
      action: AuditAction.CREATE,
      entity_type,
      entity_id: entity.id || null,
      new_values: entity,
      ip_address: this.execCtx.ip || null,
      user_agent: this.execCtx.userAgent || null,
      old_values: null,
    })
  }

  async logUpdate(entity_type: string, oldData: EntityWithId, newData: EntityWithId) {
    return await AuditLog.create({
      user_id: this.execCtx.userId || null,
      action: AuditAction.UPDATE,
      entity_type,
      entity_id: newData.id || null,
      old_values: oldData,
      new_values: newData,
      ip_address: this.execCtx.ip || null,
      user_agent: this.execCtx.userAgent || null,
    })
  }

  /**
   * Ghi log cho hành động xóa
   */
  async logDeletion(entity_type: string, entity: EntityWithId) {
    return await AuditLog.create({
      user_id: this.execCtx.userId || null,
      action: AuditAction.DELETE,
      entity_type,
      entity_id: entity.id || null,
      old_values: entity,
      new_values: null,
      ip_address: this.execCtx.ip || null,
      user_agent: this.execCtx.userAgent || null,
    })
  }
}
