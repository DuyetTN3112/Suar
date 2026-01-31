/**
 * Notification Constants
 *
 * Constants liên quan đến Notification.
 * Pattern học từ ancarat-bo: enum + options array + helper function
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

export const notificationTypeOptions = [
  // Organization
  {
    value: NotificationType.ORGANIZATION_CREATED,
    label: 'Organization Created',
    labelVi: 'Tạo tổ chức',
    category: 'organization',
  },
  {
    value: NotificationType.ORGANIZATION_INVITATION,
    label: 'Organization Invitation',
    labelVi: 'Lời mời tổ chức',
    category: 'organization',
  },
  {
    value: NotificationType.ORGANIZATION_JOIN_REQUEST,
    label: 'Join Request',
    labelVi: 'Yêu cầu tham gia',
    category: 'organization',
  },
  {
    value: NotificationType.ORGANIZATION_JOIN_APPROVED,
    label: 'Join Approved',
    labelVi: 'Đã được duyệt',
    category: 'organization',
  },
  {
    value: NotificationType.ORGANIZATION_JOIN_REJECTED,
    label: 'Join Rejected',
    labelVi: 'Bị từ chối',
    category: 'organization',
  },
  {
    value: NotificationType.ORGANIZATION_MEMBER_ADDED,
    label: 'Member Added',
    labelVi: 'Thêm thành viên',
    category: 'organization',
  },
  {
    value: NotificationType.ORGANIZATION_MEMBER_REMOVED,
    label: 'Member Removed',
    labelVi: 'Xóa thành viên',
    category: 'organization',
  },
  {
    value: NotificationType.ORGANIZATION_ROLE_CHANGED,
    label: 'Role Changed',
    labelVi: 'Đổi vai trò',
    category: 'organization',
  },

  // Project
  {
    value: NotificationType.PROJECT_CREATED,
    label: 'Project Created',
    labelVi: 'Tạo dự án',
    category: 'project',
  },
  {
    value: NotificationType.PROJECT_INVITATION,
    label: 'Project Invitation',
    labelVi: 'Lời mời dự án',
    category: 'project',
  },
  {
    value: NotificationType.PROJECT_MEMBER_ADDED,
    label: 'Project Member Added',
    labelVi: 'Thêm thành viên dự án',
    category: 'project',
  },
  {
    value: NotificationType.PROJECT_MEMBER_REMOVED,
    label: 'Project Member Removed',
    labelVi: 'Xóa thành viên dự án',
    category: 'project',
  },

  // Task
  {
    value: NotificationType.TASK_ASSIGNED,
    label: 'Task Assigned',
    labelVi: 'Được giao task',
    category: 'task',
  },
  {
    value: NotificationType.TASK_UPDATED,
    label: 'Task Updated',
    labelVi: 'Task cập nhật',
    category: 'task',
  },
  {
    value: NotificationType.TASK_COMPLETED,
    label: 'Task Completed',
    labelVi: 'Task hoàn thành',
    category: 'task',
  },
  {
    value: NotificationType.TASK_COMMENTED,
    label: 'Task Commented',
    labelVi: 'Bình luận task',
    category: 'task',
  },
  {
    value: NotificationType.TASK_DUE_SOON,
    label: 'Task Due Soon',
    labelVi: 'Task sắp đến hạn',
    category: 'task',
  },
  {
    value: NotificationType.TASK_OVERDUE,
    label: 'Task Overdue',
    labelVi: 'Task quá hạn',
    category: 'task',
  },
  {
    value: NotificationType.TASK_APPLICATION_RECEIVED,
    label: 'Application Received',
    labelVi: 'Nhận đơn ứng tuyển',
    category: 'task',
  },
  {
    value: NotificationType.TASK_APPLICATION_APPROVED,
    label: 'Application Approved',
    labelVi: 'Đơn được duyệt',
    category: 'task',
  },
  {
    value: NotificationType.TASK_APPLICATION_REJECTED,
    label: 'Application Rejected',
    labelVi: 'Đơn bị từ chối',
    category: 'task',
  },

  // Review
  {
    value: NotificationType.REVIEW_RECEIVED,
    label: 'Review Received',
    labelVi: 'Nhận đánh giá',
    category: 'review',
  },
  {
    value: NotificationType.REVIEW_REQUESTED,
    label: 'Review Requested',
    labelVi: 'Yêu cầu đánh giá',
    category: 'review',
  },

  // Message
  {
    value: NotificationType.NEW_MESSAGE,
    label: 'New Message',
    labelVi: 'Tin nhắn mới',
    category: 'message',
  },
  {
    value: NotificationType.MESSAGE_MENTION,
    label: 'Message Mention',
    labelVi: 'Được nhắc đến',
    category: 'message',
  },

  // System
  {
    value: NotificationType.SYSTEM_ANNOUNCEMENT,
    label: 'System Announcement',
    labelVi: 'Thông báo hệ thống',
    category: 'system',
  },
  {
    value: NotificationType.ACCOUNT_VERIFIED,
    label: 'Account Verified',
    labelVi: 'Tài khoản đã xác minh',
    category: 'system',
  },
]

export function getNotificationTypeLabel(type: NotificationType): string {
  return notificationTypeOptions.find((option) => option.value === type)?.label ?? 'Unknown'
}

export function getNotificationTypeLabelVi(type: NotificationType): string {
  return (
    notificationTypeOptions.find((option) => option.value === type)?.labelVi ?? 'Không xác định'
  )
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

export const notificationPriorityOptions = [
  { value: NotificationPriority.LOW, label: 'Low', labelVi: 'Thấp' },
  { value: NotificationPriority.NORMAL, label: 'Normal', labelVi: 'Bình thường' },
  { value: NotificationPriority.HIGH, label: 'High', labelVi: 'Cao' },
  { value: NotificationPriority.URGENT, label: 'Urgent', labelVi: 'Khẩn cấp' },
]
