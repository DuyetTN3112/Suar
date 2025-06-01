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
 * Notification Types
 * Các loại thông báo trong hệ thống
 */
export enum NotificationType {
  // Organization
  ORGANIZATION_CREATED = 'organization_created',
  ORGANIZATION_INVITATION = 'organization_invitation',
  ORGANIZATION_JOIN_REQUEST = 'organization_join_request',
  ORGANIZATION_JOIN_APPROVED = 'organization_join_approved',
  ORGANIZATION_JOIN_REJECTED = 'organization_join_rejected',
  ORGANIZATION_MEMBER_ADDED = 'organization_member_added',
  ORGANIZATION_MEMBER_REMOVED = 'organization_member_removed',
  ORGANIZATION_ROLE_CHANGED = 'organization_role_changed',

  // Project
  PROJECT_CREATED = 'project_created',
  PROJECT_INVITATION = 'project_invitation',
  PROJECT_MEMBER_ADDED = 'project_member_added',
  PROJECT_MEMBER_REMOVED = 'project_member_removed',

  // Task
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_COMMENTED = 'task_commented',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue',
  TASK_APPLICATION_RECEIVED = 'task_application_received',
  TASK_APPLICATION_APPROVED = 'task_application_approved',
  TASK_APPLICATION_REJECTED = 'task_application_rejected',

  // Review
  REVIEW_RECEIVED = 'review_received',
  REVIEW_REQUESTED = 'review_requested',

  // Message
  NEW_MESSAGE = 'new_message',
  MESSAGE_MENTION = 'message_mention',

  // System
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  ACCOUNT_VERIFIED = 'account_verified',
}

/**
 * Notification Priority
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}
