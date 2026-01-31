/**
 * Audit Log Helpers
 *
 * Helpers for audit logging operations.
 * Pattern học từ ancarat-bo: action_log_helpers.ts
 *
 * @module AuditLogHelpers
 */

import { AuditAction, EntityType } from '#constants/audit_constants'

/**
 * Pick specific fields from an object for audit logging
 */
export function pickAuditFields<T extends object, K extends keyof T>(
  obj: T,
  fields: readonly K[]
): Pick<T, K> {
  const result: Partial<Pick<T, K>> = {}
  fields.forEach((field) => {
    if (field in obj) {
      result[field] = obj[field]
    }
  })
  return result as Pick<T, K>
}

/**
 * Tạo mô tả cho audit log
 */
export function createAuditDescription(
  action: AuditAction,
  entityType: EntityType,
  entityId: number | string,
  additionalInfo?: string
): string {
  const actionMap: Partial<Record<AuditAction, string>> = {
    [AuditAction.CREATE]: 'Created',
    [AuditAction.UPDATE]: 'Updated',
    [AuditAction.DELETE]: 'Deleted',
    [AuditAction.SOFT_DELETE]: 'Soft deleted',
    [AuditAction.HARD_DELETE]: 'Hard deleted',
    [AuditAction.RESTORE]: 'Restored',
    [AuditAction.LOGIN]: 'Logged in',
    [AuditAction.LOGOUT]: 'Logged out',
    [AuditAction.APPROVE]: 'Approved',
    [AuditAction.REJECT]: 'Rejected',
    [AuditAction.INVITE]: 'Invited to',
    [AuditAction.JOIN]: 'Joined',
    [AuditAction.LEAVE]: 'Left',
    [AuditAction.TRANSFER]: 'Transferred',
    [AuditAction.ASSIGN]: 'Assigned',
    [AuditAction.UNASSIGN]: 'Unassigned',
    [AuditAction.UPDATE_STATUS]: 'Updated status',
    [AuditAction.UPDATE_TIME]: 'Updated time',
    [AuditAction.REVOKE_ACCESS]: 'Revoked access',
    [AuditAction.SWITCH_ORGANIZATION]: 'Switched organization',
    [AuditAction.DEACTIVATE]: 'Deactivated',
    [AuditAction.UPDATE_MEMBER_ROLE]: 'Updated member role',
  }

  const actionText = actionMap[action] ?? action
  const description = `${actionText} ${entityType} #${entityId}${additionalInfo ? ` - ${additionalInfo}` : ''}`

  return description
}

/**
 * Tạo mô tả tiếng Việt cho audit log
 */
export function createAuditDescriptionVi(
  action: AuditAction,
  entityType: EntityType,
  entityId: number | string,
  additionalInfo?: string
): string {
  const actionMap: Partial<Record<AuditAction, string>> = {
    [AuditAction.CREATE]: 'Đã tạo',
    [AuditAction.UPDATE]: 'Đã cập nhật',
    [AuditAction.DELETE]: 'Đã xóa',
    [AuditAction.SOFT_DELETE]: 'Đã xóa mềm',
    [AuditAction.HARD_DELETE]: 'Đã xóa vĩnh viễn',
    [AuditAction.RESTORE]: 'Đã khôi phục',
    [AuditAction.LOGIN]: 'Đã đăng nhập',
    [AuditAction.LOGOUT]: 'Đã đăng xuất',
    [AuditAction.APPROVE]: 'Đã phê duyệt',
    [AuditAction.REJECT]: 'Đã từ chối',
    [AuditAction.INVITE]: 'Đã mời vào',
    [AuditAction.JOIN]: 'Đã tham gia',
    [AuditAction.LEAVE]: 'Đã rời khỏi',
    [AuditAction.TRANSFER]: 'Đã chuyển giao',
    [AuditAction.ASSIGN]: 'Đã giao việc',
    [AuditAction.UNASSIGN]: 'Đã bỏ giao việc',
    [AuditAction.UPDATE_STATUS]: 'Đã cập nhật trạng thái',
    [AuditAction.UPDATE_TIME]: 'Đã cập nhật thời gian',
    [AuditAction.REVOKE_ACCESS]: 'Đã thu hồi quyền truy cập',
    [AuditAction.SWITCH_ORGANIZATION]: 'Đã chuyển tổ chức',
    [AuditAction.DEACTIVATE]: 'Đã vô hiệu hóa',
    [AuditAction.UPDATE_MEMBER_ROLE]: 'Đã cập nhật vai trò thành viên',
  }

  const entityMap: Partial<Record<EntityType, string>> = {
    [EntityType.USER]: 'người dùng',
    [EntityType.ORGANIZATION]: 'tổ chức',
    [EntityType.ORGANIZATION_USER]: 'thành viên tổ chức',
    [EntityType.PROJECT]: 'dự án',
    [EntityType.PROJECT_MEMBER]: 'thành viên dự án',
    [EntityType.TASK]: 'công việc',
    [EntityType.TASK_APPLICATION]: 'đơn ứng tuyển',
    [EntityType.TASK_ASSIGNMENT]: 'phân công',
    [EntityType.REVIEW]: 'đánh giá',
    [EntityType.NOTIFICATION]: 'thông báo',
    [EntityType.CONVERSATION]: 'cuộc trò chuyện',
    [EntityType.MESSAGE]: 'tin nhắn',
  }

  const actionText = actionMap[action] ?? action
  const entityText = entityMap[entityType] ?? entityType
  const description = `${actionText} ${entityText} #${entityId}${additionalInfo ? ` - ${additionalInfo}` : ''}`

  return description
}

/**
 * Format changes for audit log
 * So sánh old và new values, trả về các thay đổi
 */
export function formatAuditChanges<T extends object>(
  oldValues: T | null,
  newValues: T | null,
  excludeFields: (keyof T)[] = []
): { field: string; oldValue: unknown; newValue: unknown }[] {
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = []

  if (!oldValues && !newValues) {
    return changes
  }

  const allKeys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ]) as Set<keyof T>

  allKeys.forEach((key) => {
    if (excludeFields.includes(key)) {
      return
    }

    const oldVal = oldValues ? oldValues[key] : undefined
    const newVal = newValues ? newValues[key] : undefined

    // Skip if both are undefined
    if (oldVal === undefined && newVal === undefined) {
      return
    }

    // Compare values (handle objects by JSON stringify)
    const oldStr = JSON.stringify(oldVal)
    const newStr = JSON.stringify(newVal)

    if (oldStr !== newStr) {
      changes.push({
        field: String(key),
        oldValue: oldVal,
        newValue: newVal,
      })
    }
  })

  return changes
}

/**
 * Log params for bulk delete operations
 * Pattern từ ancarat-bo: logDeleteMany
 */
export interface LogDeleteManyParams<T = object, F extends keyof T = keyof T> {
  userId: number
  entityType: EntityType
  deletedItems: T[]
  fields?: readonly F[]
  description?: string
}

/**
 * Chuẩn bị data cho bulk delete audit log
 */
export function prepareDeleteManyLog<T extends object, F extends keyof T = keyof T>({
  deletedItems,
  fields = ['id'] as unknown as readonly F[],
}: LogDeleteManyParams<T, F>): Record<string, unknown>[] {
  return deletedItems.map((item) => {
    const result: Record<string, unknown> = {}
    fields.forEach((field) => {
      result[String(field)] = item[field]
    })
    return result
  })
}

/**
 * Sensitive fields that should be masked in audit logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'password_hash',
  'token',
  'secret',
  'api_key',
  'refresh_token',
]

/**
 * Mask sensitive fields in an object for audit logging
 */
export function maskSensitiveFields<T extends object>(obj: T): T {
  const result = { ...obj }

  for (const key of Object.keys(result) as (keyof T)[]) {
    if (SENSITIVE_FIELDS.includes(String(key).toLowerCase())) {
      ;(result[key] as unknown) = '***MASKED***'
    }
  }

  return result
}
