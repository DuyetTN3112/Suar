type AuditActivityCategory =
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

type AuditActivityOutcome = 'recorded' | 'success' | 'warning' | 'failure'

interface AuditLogForSurface {
  action: string
  resource_type: string
  created_at: string
  event_name?: string | null
  event_family?: string | null
  module?: string | null
  outcome?: string | null
  user: {
    id: string
    username: string
  } | null
}

export interface UserAuditActivityResponse {
  category: AuditActivityCategory
  outcome: AuditActivityOutcome
  title: string
  description: string
  occurredAt: string
}

export interface OrganizationAuditActivityResponse extends UserAuditActivityResponse {
  actorLabel: string
  subjectLabel: string
}

interface ActivityCopy {
  category: AuditActivityCategory
  title: string
  userDescription: string
  organizationDescription: string
  subjectLabel: string
}

const activityCopyByCategory: Record<AuditActivityCategory, ActivityCopy> = {
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

function eventFingerprint(log: AuditLogForSurface): string {
  return [log.event_name, log.event_family, log.module, log.action, log.resource_type]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()
}

function getActivityCopy(log: AuditLogForSurface): ActivityCopy {
  const fingerprint = eventFingerprint(log)

  if (/password|credential|oauth|session|login|logout|mfa|security/.test(fingerprint)) {
    return activityCopyByCategory.security
  }
  if (/permission|role|access/.test(fingerprint)) {
    return activityCopyByCategory.access
  }
  if (/member|membership|invite|invitation|join/.test(fingerprint)) {
    return activityCopyByCategory.membership
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

function toActivityOutcome(value: string | null | undefined): AuditActivityOutcome {
  if (value === 'success' || value === 'warning' || value === 'failure') {
    return value
  }

  return 'recorded'
}

function toActorLabel(user: AuditLogForSurface['user']): string {
  const username = user?.username?.trim()
  return username || 'Hệ thống'
}

export function mapUserAuditActivityResponse(
  log: AuditLogForSurface
): UserAuditActivityResponse {
  const copy = getActivityCopy(log)

  return {
    category: copy.category,
    outcome: toActivityOutcome(log.outcome),
    title: copy.title,
    description: copy.userDescription,
    occurredAt: log.created_at,
  }
}

export function mapOrganizationAuditActivityResponse(
  log: AuditLogForSurface
): OrganizationAuditActivityResponse {
  const copy = getActivityCopy(log)

  return {
    category: copy.category,
    outcome: toActivityOutcome(log.outcome),
    title: copy.title,
    description: copy.organizationDescription,
    occurredAt: log.created_at,
    actorLabel: toActorLabel(log.user),
    subjectLabel: copy.subjectLabel,
  }
}
