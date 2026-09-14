export type AuditActivityCategory =
  | 'account'
  | 'access'
  | 'security'
  | 'organization'
  | 'membership'
  | 'project'
  | 'task'
  | 'review'
  | 'billing'
  | 'activity'

export type AuditActivityOutcome = 'recorded' | 'success' | 'warning' | 'failure'

export interface AuditLogForSurface {
  id?: string
  action: string
  resource_type: string
  resource_id?: string | null
  created_at: string
  source_occurred_at?: string | null
  details?: {
    old_values?: unknown
    new_values?: unknown
  }
  event_name?: string | null
  event_family?: string | null
  module?: string | null
  stage?: string | null
  outcome?: string | null
  actor_type?: string | null
  actor_user_id?: string | null
  actor_role_surface?: string | null
  target_type?: string | null
  target_id?: string | null
  target_label?: string | null
  target_org_id?: string | null
  user: {
    id: string
    username: string
  } | null
}

export interface AuditActivityBaseResponse {
  category: AuditActivityCategory
  outcome: AuditActivityOutcome
  title: string
  description: string
  occurredAt: string
}

export interface ActivityCopy {
  category: AuditActivityCategory
  title: string
  userDescription: string
  organizationDescription: string
  subjectLabel: string
}

export const activityCopyByCategory: Record<AuditActivityCategory, ActivityCopy> = {
  account: {
    category: 'account',
    title: 'Hoạt động tài khoản',
    userDescription: 'Một hoạt động liên quan đến tài khoản của bạn đã được ghi nhận.',
    organizationDescription: 'Một hoạt động tài khoản trong tổ chức đã được ghi nhận.',
    subjectLabel: 'Tài khoản',
  },
  access: {
    category: 'access',
    title: 'Quyền truy cập đã thay đổi',
    userDescription: 'Quyền hoặc vai trò liên quan đến tài khoản của bạn đã được cập nhật.',
    organizationDescription: 'Quyền hoặc vai trò trong tổ chức đã được cập nhật.',
    subjectLabel: 'Quyền truy cập',
  },
  security: {
    category: 'security',
    title: 'Hoạt động bảo mật',
    userDescription: 'Một hoạt động bảo mật liên quan đến tài khoản của bạn đã được ghi nhận.',
    organizationDescription: 'Một hoạt động bảo mật liên quan đến tổ chức đã được ghi nhận.',
    subjectLabel: 'Bảo mật',
  },
  organization: {
    category: 'organization',
    title: 'Thiết lập tổ chức đã thay đổi',
    userDescription: 'Thông tin tổ chức liên quan đến bạn đã được cập nhật.',
    organizationDescription: 'Thiết lập hoặc thông tin tổ chức đã được cập nhật.',
    subjectLabel: 'Tổ chức',
  },
  membership: {
    category: 'membership',
    title: 'Thành viên tổ chức đã thay đổi',
    userDescription: 'Trạng thái thành viên hoặc lời mời của bạn đã được cập nhật.',
    organizationDescription: 'Thành viên, vai trò hoặc lời mời trong tổ chức đã được cập nhật.',
    subjectLabel: 'Thành viên',
  },
  project: {
    category: 'project',
    title: 'Dự án đã thay đổi',
    userDescription: 'Một thay đổi dự án liên quan đến bạn đã được ghi nhận.',
    organizationDescription: 'Một thay đổi dự án trong tổ chức đã được ghi nhận.',
    subjectLabel: 'Dự án',
  },
  task: {
    category: 'task',
    title: 'Công việc đã thay đổi',
    userDescription: 'Một thay đổi công việc liên quan đến bạn đã được ghi nhận.',
    organizationDescription: 'Một thay đổi công việc trong tổ chức đã được ghi nhận.',
    subjectLabel: 'Công việc',
  },
  review: {
    category: 'review',
    title: 'Đánh giá đã thay đổi',
    userDescription: 'Một thay đổi đánh giá liên quan đến bạn đã được ghi nhận.',
    organizationDescription: 'Một thay đổi đánh giá trong tổ chức đã được ghi nhận.',
    subjectLabel: 'Đánh giá',
  },
  billing: {
    category: 'billing',
    title: 'Gói dịch vụ đã thay đổi',
    userDescription: 'Thông tin gói dịch vụ liên quan đến bạn đã được cập nhật.',
    organizationDescription: 'Thông tin gói dịch vụ của tổ chức đã được cập nhật.',
    subjectLabel: 'Gói dịch vụ',
  },
  activity: {
    category: 'activity',
    title: 'Hoạt động đã được ghi nhận',
    userDescription: 'Một hoạt động liên quan đến bạn đã được ghi nhận.',
    organizationDescription: 'Một hoạt động trong tổ chức đã được ghi nhận.',
    subjectLabel: 'Hoạt động',
  },
}

export function eventFingerprint(log: AuditLogForSurface): string {
  return [log.event_name, log.event_family, log.module, log.action, log.resource_type]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()
}

export function getActivityCopy(log: AuditLogForSurface): ActivityCopy {
  const fingerprint = eventFingerprint(log)

  if (/password|credential|oauth|session|login|logout|mfa|security/.test(fingerprint)) {
    return activityCopyByCategory.security
  }
  if (/member|membership|invite|invitation|join/.test(fingerprint)) {
    return activityCopyByCategory.membership
  }
  if (/permission|role|access/.test(fingerprint)) {
    return activityCopyByCategory.access
  }
  if (/organization|\borg\b/.test(fingerprint)) {
    return activityCopyByCategory.organization
  }
  if (/project/.test(fingerprint)) {
    return activityCopyByCategory.project
  }
  if (/task/.test(fingerprint)) {
    return activityCopyByCategory.task
  }
  if (/review|dispute/.test(fingerprint)) {
    return activityCopyByCategory.review
  }
  if (/billing|subscription|package/.test(fingerprint)) {
    return activityCopyByCategory.billing
  }
  if (/profile|account|user/.test(fingerprint)) {
    return activityCopyByCategory.account
  }

  return activityCopyByCategory.activity
}

export function toActivityOutcome(
  value: string | null | undefined,
  stage?: string | null
): AuditActivityOutcome {
  if (value === 'success' || value === 'warning' || value === 'failure') {
    return value
  }

  if (stage === 'completed') return 'success'
  if (stage === 'failed') return 'failure'

  return 'recorded'
}

export function toActorLabel(
  user: AuditLogForSurface['user'],
  actorType: AuditLogForSurface['actor_type']
): string {
  const username = user?.username.trim()
  if (username) return username
  if (actorType === 'user') return 'Người dùng đã xóa'
  if (actorType === 'automation' || actorType === 'service') return 'Tự động hóa'
  if (actorType === 'integration') return 'Tích hợp'
  if (actorType === 'system') return 'Hệ thống'
  return 'Không xác định'
}

export const REDACTED_VALUE_PATTERN = /^\[?redacted(?::(?:changed|new|old))?\]?$/i
export const MAX_DISPLAY_VALUE_LENGTH = 200

export function asAuditRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function normalizeDisplayValue(value: unknown): {
  value: string | number | boolean | null
  redacted: boolean
} {
  if (value === null || value === undefined) {
    return { value: null, redacted: false }
  }

  if (typeof value === 'string') {
    if (REDACTED_VALUE_PATTERN.test(value.trim())) {
      return { value: null, redacted: true }
    }
    return {
      value:
        value.length > MAX_DISPLAY_VALUE_LENGTH
          ? `${value.slice(0, MAX_DISPLAY_VALUE_LENGTH - 1)}…`
          : value,
      redacted: false,
    }
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return { value, redacted: false }
  }

  return { value: null, redacted: true }
}
