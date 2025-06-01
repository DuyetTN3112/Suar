/**
 * Audit Constants
 *
 * Constants liên quan đến Audit Log, Action Log.
 *
 * CLEANUP 2026-03-01:
 *   - XÓA auditActionOptions, getAuditActionLabel, getAuditActionLabelVi → 0 usages
 *   - XÓA entityTypeOptions, getEntityTypeLabel → 0 usages
 *   - XÓA AUDIT_LOG_FIELDS → 0 usages
 *
 * @module AuditConstants
 */

/**
 * Audit Action Types
 * Các loại hành động trong hệ thống
 */
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SOFT_DELETE = 'soft_delete',
  HARD_DELETE = 'hard_delete',
  RESTORE = 'restore',
  LOGIN = 'login',
  LOGOUT = 'logout',
  APPROVE = 'approve',
  REJECT = 'reject',
  INVITE = 'invite',
  JOIN = 'join',
  LEAVE = 'leave',
  TRANSFER = 'transfer',
  // Task-specific actions
  ASSIGN = 'assign',
  UNASSIGN = 'unassign',
  UPDATE_STATUS = 'update_status',
  UPDATE_TIME = 'update_time',
  REVOKE_ACCESS = 'revoke_task_access',
  // Organization-specific actions
  SWITCH_ORGANIZATION = 'switch_organization',
  DEACTIVATE = 'deactivate',
  UPDATE_MEMBER_ROLE = 'update_member_role',
}

/**
 * Entity Types
 * Các loại entity trong hệ thống (dùng cho audit log)
 */
export enum EntityType {
  USER = 'user',
  ORGANIZATION = 'organization',
  ORGANIZATION_USER = 'organization_user',
  PROJECT = 'project',
  PROJECT_MEMBER = 'project_member',
  TASK = 'task',
  TASK_APPLICATION = 'task_application',
  TASK_ASSIGNMENT = 'task_assignment',
  REVIEW = 'review',
  NOTIFICATION = 'notification',
  CONVERSATION = 'conversation',
  MESSAGE = 'message',
}
