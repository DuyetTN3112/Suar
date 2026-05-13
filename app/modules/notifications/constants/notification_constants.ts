/**
 * Notification Constants
 *
 * Constants liên quan đến Notification.
 *
 * CLEANUP 2026-03-01:
 *   - XÓA notificationTypeOptions, getNotificationTypeLabel, getNotificationTypeLabelVi → 0 usages
 *   - XÓA notificationPriorityOptions → 0 usages
 *   - GIỮ enums → sẽ cần khi wire events (ARCHITECTURE_PLAN §2)
 *
 * @module NotificationConstants
 */

/**
 * Single source of truth for backend notification types.
 *
 * NOTE:
 * - Keep backend-only. Frontend has its own constants module.
 * - Includes both current names and legacy names still present in flows.
 */
export const BACKEND_NOTIFICATION_TYPES = {
  // Organization
  ORGANIZATION_CREATED: 'organization_created',
  ORGANIZATION_INVITATION: 'organization_invitation',
  ORGANIZATION_JOIN_REQUEST: 'organization_join_request',
  ORGANIZATION_JOIN_APPROVED: 'organization_join_approved',
  ORGANIZATION_JOIN_REJECTED: 'organization_join_rejected',
  ORGANIZATION_MEMBER_ADDED: 'organization_member_added',
  ORGANIZATION_MEMBER_REMOVED: 'organization_member_removed',
  ORGANIZATION_ROLE_CHANGED: 'organization_role_changed',

  // Project
  PROJECT_CREATED: 'project_created',
  PROJECT_INVITATION: 'project_invitation',
  PROJECT_MEMBER_ADDED: 'project_member_added',
  PROJECT_MEMBER_REMOVED: 'project_member_removed',

  // Task
  TASK_ASSIGNED: 'task_assigned',
  TASK_UPDATED: 'task_updated',
  TASK_COMPLETED: 'task_completed',
  TASK_COMMENTED: 'task_commented',
  TASK_DUE_SOON: 'task_due_soon',
  TASK_OVERDUE: 'task_overdue',
  TASK_APPLICATION_RECEIVED: 'task_application_received',
  TASK_APPLICATION_APPROVED: 'task_application_approved',
  TASK_APPLICATION_REJECTED: 'task_application_rejected',

  // Review
  REVIEW_RECEIVED: 'review_received',
  REVIEW_REQUESTED: 'review_requested',

  // Message
  NEW_MESSAGE: 'new_message',
  MESSAGE_MENTION: 'message_mention',

  // System
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  ACCOUNT_VERIFIED: 'account_verified',

  // Legacy values still emitted by existing commands/listeners
  MEMBER_ADDED: 'member_added',
  JOIN_REQUEST_APPROVED: 'join_request_approved',
  JOIN_REQUEST_REJECTED: 'join_request_rejected',
  MEMBER_REMOVED: 'member_removed',
  OWNERSHIP_TRANSFERRED: 'ownership_transferred',
  ROLE_CHANGED: 'role_changed',
  PROJECT_OWNERSHIP_TRANSFERRED: 'project_ownership_transferred',
  TASK_UNASSIGNED: 'task_unassigned',
  TASK_REASSIGNED: 'task_reassigned',
  TASK_DELETED: 'task_deleted',
  TASK_ACCESS_REVOKED: 'task_access_revoked',
  ASSIGNMENT_REVOKED_NEED_ACTION: 'assignment_revoked_need_action',
  TASK_STATUS_UPDATED: 'task_status_updated',
  ACCOUNT_DEACTIVATED: 'account_deactivated',
  ORGANIZATION: 'organization',
  REVIEW: 'review',
  INFO: 'info',
  TASK_APPLICATION: 'task_application',
  TASK_APPLICATION_REVIEW: 'task_application_review',
} as const

export type BackendNotificationType =
  (typeof BACKEND_NOTIFICATION_TYPES)[keyof typeof BACKEND_NOTIFICATION_TYPES]

export const BACKEND_NOTIFICATION_ENTITY_TYPES = {
  TASK: 'task',
  ORGANIZATION: 'organization',
  PROJECT: 'project',
  USER: 'user',
  TASK_APPLICATION: 'task_application',
} as const

export type BackendNotificationEntityType =
  (typeof BACKEND_NOTIFICATION_ENTITY_TYPES)[keyof typeof BACKEND_NOTIFICATION_ENTITY_TYPES]

// Backward-compatible alias used by existing application services.
export type NotificationTypeValue = BackendNotificationType

/**
 * Notification Priority
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}
