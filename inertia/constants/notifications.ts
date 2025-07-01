export const FRONTEND_NOTIFICATION_TYPES = {
  DEFAULT: 'default',
  TASK: 'task',
  TASK_ASSIGNED: 'task_assigned',
  TASK_OVERDUE: 'task_overdue',
  TASK_APPLICATION: 'task_application',
  TASK_APPLICATION_REVIEW: 'task_application_review',
  MESSAGE: 'message',
  CONVERSATION: 'conversation',
  WARNING: 'warning',
  ALERT: 'alert',
  REVIEW: 'review',
  RATING: 'rating',
  TEAM: 'team',
  ORGANIZATION: 'organization',
  DOCUMENT: 'document',
  FILE: 'file',
  INFO: 'info',
} as const

export type FrontendNotificationType =
  (typeof FRONTEND_NOTIFICATION_TYPES)[keyof typeof FRONTEND_NOTIFICATION_TYPES]

export const FRONTEND_DIALOG_NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
} as const

export type FrontendDialogNotificationType =
  (typeof FRONTEND_DIALOG_NOTIFICATION_TYPES)[keyof typeof FRONTEND_DIALOG_NOTIFICATION_TYPES]
