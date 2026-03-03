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

export type UserAuditPerspective = 'performed_by_you' | 'affected_you'

export type UserAuditActivityKey =
  | 'account.created'
  | 'account.profile_updated'
  | 'account.restricted'
  | 'access.updated'
  | 'activity.recorded'
  | 'billing.created'
  | 'billing.removed'
  | 'billing.updated'
  | 'membership.invitation'
  | 'membership.removed'
  | 'membership.role_changed'
  | 'membership.updated'
  | 'organization.created'
  | 'organization.removed'
  | 'organization.updated'
  | 'project.created'
  | 'project.removed'
  | 'project.updated'
  | 'review.created'
  | 'review.removed'
  | 'review.updated'
  | 'security.activity'
  | 'security.connected_account'
  | 'security.credential_changed'
  | 'security.login'
  | 'security.logout'
  | 'task.created'
  | 'task.removed'
  | 'task.updated'

export type UserAuditActorType =
  | 'you'
  | 'another_authorized_user'
  | 'system'
  | 'automation'
  | 'integration'
  | 'unknown'

export interface UserAuditActivityChange {
  field: string
  operation: 'added' | 'removed' | 'changed'
  before: string | number | boolean | null
  after: string | number | boolean | null
  redacted: boolean
}

interface AuditActivityBaseResponse {
  category: AuditActivityCategory
  outcome: AuditActivityOutcome
  title: string
  description: string
  occurredAt: string
}

export interface UserAuditActivityResponse extends AuditActivityBaseResponse {
  id: string
  activityKey: UserAuditActivityKey
  perspective: UserAuditPerspective
  actor: {
    type: UserAuditActorType
    label: string
  }
  subject: {
    category: AuditActivityCategory
    label: string
  }
  changes: UserAuditActivityChange[]
  changeCount: number
  hasHiddenChanges: boolean
}

export interface OrganizationAuditActivityResponse extends AuditActivityBaseResponse {
  id: string
  actionCode: string
  actionKey: string
  actor: {
    type: 'user' | 'deleted_user' | 'system' | 'automation' | 'integration' | 'unknown'
    label: string
    roleLabel: string | null
  }
  target: {
    type: string
    id: string | null
    label: string
  }
  changes: {
    field: string
    operation: 'added' | 'removed' | 'changed'
    before: string | number | boolean | null
    after: string | number | boolean | null
    redacted: boolean
  }[]
  changeCount: number
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

function toActivityOutcome(
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

function toActorLabel(
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

type OrganizationActorType = OrganizationAuditActivityResponse['actor']['type']
type OrganizationAuditChange = OrganizationAuditActivityResponse['changes'][number]
type OrganizationAuditValue = OrganizationAuditChange['before']

const SAFE_CHANGE_FIELDS: Partial<Record<AuditActivityCategory, ReadonlySet<string>>> = {
  access: new Set(['org_role', 'role', 'status']),
  billing: new Set(['billing_cycle', 'plan', 'renew_at', 'status']),
  membership: new Set(['org_role', 'role', 'status']),
  organization: new Set(['name', 'owner_id', 'status', 'website']),
  project: new Set([
    'end_date',
    'manager_id',
    'name',
    'owner_id',
    'start_date',
    'status',
    'visibility',
  ]),
  review: new Set(['outcome', 'reviewer_id', 'status', 'visibility']),
  task: new Set([
    'actual_time',
    'assigned_to',
    'due_date',
    'end_date',
    'estimated_time',
    'parent_task_id',
    'priority',
    'start_date',
    'status',
    'task_type',
    'task_visibility',
    'title',
  ]),
}

const REDACTED_VALUE_PATTERN = /^\[?redacted(?::(?:changed|new|old))?\]?$/i
const MAX_DISPLAY_VALUE_LENGTH = 200
const MAX_USER_CHANGE_COUNT = 12

const USER_VISIBLE_CHANGE_FIELDS: Partial<Record<AuditActivityCategory, ReadonlySet<string>>> = {
  account: new Set(['is_external_contributor', 'language', 'status', 'timezone', 'username']),
  access: new Set(['org_role', 'role', 'status']),
  membership: new Set(['org_role', 'role', 'status']),
  project: new Set(['status', 'visibility']),
  review: new Set(['outcome', 'status', 'visibility']),
  security: new Set(['method']),
  task: new Set(['priority', 'status', 'task_visibility']),
}

const USER_REDACTED_CHANGE_FIELDS: Partial<Record<AuditActivityCategory, ReadonlySet<string>>> = {
  account: new Set(['address', 'avatar_url', 'bio', 'email', 'phone']),
}

function asAuditRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function normalizeDisplayValue(value: unknown): {
  value: OrganizationAuditValue
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

function asCustomRolePermissionMap(value: unknown): Map<string, string> {
  const result = new Map<string, string>()
  if (!Array.isArray(value)) return result

  for (const candidate of value.slice(0, 24)) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue
    const role = candidate as Record<string, unknown>
    const name = role['name']
    const permissions = role['permissions']
    if (typeof name !== 'string' || !/^[a-z0-9_]{1,64}$/.test(name)) continue
    if (!Array.isArray(permissions)) continue

    const safePermissions = [
      ...new Set(
        permissions
          .filter(
            (permission): permission is string =>
              typeof permission === 'string' && /^[a-z0-9_.:-]{1,80}$/.test(permission)
          )
          .slice(0, 40)
      ),
    ].sort()
    result.set(name, safePermissions.join(', '))
  }

  return result
}

function buildCustomRoleChanges(
  beforeValue: unknown,
  afterValue: unknown
): OrganizationAuditChange[] {
  const before = asCustomRolePermissionMap(beforeValue)
  const after = asCustomRolePermissionMap(afterValue)
  const names = [...new Set([...before.keys(), ...after.keys()])].sort()

  return names.flatMap((name): OrganizationAuditChange[] => {
    const beforeExists = before.has(name)
    const afterExists = after.has(name)
    const beforePermissions = before.get(name) ?? null
    const afterPermissions = after.get(name) ?? null
    if (beforePermissions === afterPermissions && beforeExists === afterExists) return []

    return [
      {
        field: `custom_role.${name}`,
        operation: !beforeExists ? 'added' : !afterExists ? 'removed' : 'changed',
        before: beforePermissions,
        after: afterPermissions,
        redacted: false,
      },
    ]
  })
}

function buildOrganizationChanges(
  log: AuditLogForSurface,
  category: AuditActivityCategory
): OrganizationAuditChange[] {
  const oldValues = asAuditRecord(log.details?.old_values)
  const newValues = asAuditRecord(log.details?.new_values)
  const allowedFields = SAFE_CHANGE_FIELDS[category] ?? new Set<string>()
  const fields = [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])]

  const scalarChanges = fields.flatMap((field): OrganizationAuditChange[] => {
    if (!allowedFields.has(field)) return []

    const beforeExists = Object.hasOwn(oldValues, field)
    const afterExists = Object.hasOwn(newValues, field)
    const beforeRaw = beforeExists ? oldValues[field] : null
    const afterRaw = afterExists ? newValues[field] : null
    if (JSON.stringify(beforeRaw) === JSON.stringify(afterRaw)) return []

    const before = normalizeDisplayValue(beforeRaw)
    const after = normalizeDisplayValue(afterRaw)
    const operation = !beforeExists ? 'added' : !afterExists ? 'removed' : 'changed'

    return [
      {
        field,
        operation,
        before: before.value,
        after: after.value,
        redacted: before.redacted || after.redacted,
      },
    ]
  })

  const customRoleChanges =
    category === 'access'
      ? buildCustomRoleChanges(oldValues['custom_roles'], newValues['custom_roles'])
      : []

  return [...scalarChanges, ...customRoleChanges]
}

function toOrganizationActorType(log: AuditLogForSurface): OrganizationActorType {
  if (log.actor_type === 'user') return log.user ? 'user' : 'deleted_user'
  if (log.actor_type === 'automation' || log.actor_type === 'service') return 'automation'
  if (log.actor_type === 'integration') return 'integration'
  if (log.actor_type === 'system') return 'system'
  if (log.user) return 'user'
  return 'unknown'
}

function normalizeActionKey(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || 'recorded'
}

function targetLabel(log: AuditLogForSurface, fallback: string): string {
  const oldValues = asAuditRecord(log.details?.old_values)
  const newValues = asAuditRecord(log.details?.new_values)

  for (const field of ['title', 'name', 'email', 'username']) {
    const candidate = newValues[field] ?? oldValues[field]
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().slice(0, MAX_DISPLAY_VALUE_LENGTH)
    }
  }

  return log.target_label?.trim() || fallback
}

function userActivityKey(
  log: AuditLogForSurface,
  category: AuditActivityCategory
): UserAuditActivityKey {
  const fingerprint = eventFingerprint(log)

  if (category === 'security') {
    if (/\blogout\b|signed[_ .-]?out/.test(fingerprint)) return 'security.logout'
    if (/\blogin\b|signed[_ .-]?in/.test(fingerprint)) return 'security.login'
    if (/password|credential/.test(fingerprint)) return 'security.credential_changed'
    if (/oauth/.test(fingerprint)) return 'security.connected_account'
    return 'security.activity'
  }

  if (category === 'membership') {
    if (/invite|invitation/.test(fingerprint)) return 'membership.invitation'
    if (/remove|revoke|leave/.test(fingerprint)) return 'membership.removed'
    if (/role/.test(fingerprint)) return 'membership.role_changed'
    return 'membership.updated'
  }

  if (category === 'access') return 'access.updated'
  if (category === 'account') {
    if (/register|create/.test(fingerprint)) return 'account.created'
    if (/activate|deactivate|status|suspend|delete/.test(fingerprint)) {
      return 'account.restricted'
    }
    return 'account.profile_updated'
  }

  const operation = /delete|remove/.test(fingerprint)
    ? 'removed'
    : /\bcreate\b|created|add/.test(fingerprint)
      ? 'created'
      : 'updated'

  if (
    category === 'organization' ||
    category === 'project' ||
    category === 'task' ||
    category === 'review' ||
    category === 'billing'
  ) {
    return `${category}.${operation}`
  }

  return 'activity.recorded'
}

function toUserActor(
  log: AuditLogForSurface,
  viewerUserId: string
): {
  type: UserAuditActorType
  label: string
  perspective: UserAuditPerspective
} {
  const actorUserId = log.actor_user_id ?? log.user?.id ?? null
  if (actorUserId === viewerUserId) {
    return { type: 'you', label: 'Bạn', perspective: 'performed_by_you' }
  }
  if (log.actor_type === 'system') {
    return { type: 'system', label: 'Hệ thống', perspective: 'affected_you' }
  }
  if (log.actor_type === 'automation' || log.actor_type === 'service') {
    return { type: 'automation', label: 'Tự động hóa', perspective: 'affected_you' }
  }
  if (log.actor_type === 'integration') {
    return { type: 'integration', label: 'Tích hợp', perspective: 'affected_you' }
  }
  if (log.actor_type === 'user' || actorUserId) {
    return {
      type: 'another_authorized_user',
      label: 'Người có thẩm quyền',
      perspective: 'affected_you',
    }
  }

  return { type: 'unknown', label: 'Không xác định', perspective: 'affected_you' }
}

function isViewerAccountTarget(log: AuditLogForSurface, viewerUserId: string): boolean {
  const targetType = log.target_type ?? log.resource_type
  const targetId = log.target_id ?? log.resource_id
  return targetType === 'user' && targetId === viewerUserId
}

function buildUserChanges(
  log: AuditLogForSurface,
  category: AuditActivityCategory,
  viewerUserId: string
): { changes: UserAuditActivityChange[]; hasHiddenChanges: boolean } {
  const oldValues = asAuditRecord(log.details?.old_values)
  const newValues = asAuditRecord(log.details?.new_values)
  const fields = [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])]
  const visibleFields =
    category === 'account' && !isViewerAccountTarget(log, viewerUserId)
      ? new Set<string>()
      : (USER_VISIBLE_CHANGE_FIELDS[category] ?? new Set<string>())
  const redactedFields =
    category === 'account' && isViewerAccountTarget(log, viewerUserId)
      ? (USER_REDACTED_CHANGE_FIELDS.account ?? new Set<string>())
      : new Set<string>()
  let hasHiddenChanges = false
  const changes: UserAuditActivityChange[] = []

  for (const field of fields) {
    const beforeExists = Object.hasOwn(oldValues, field)
    const afterExists = Object.hasOwn(newValues, field)
    const beforeRaw = beforeExists ? oldValues[field] : null
    const afterRaw = afterExists ? newValues[field] : null
    if (JSON.stringify(beforeRaw) === JSON.stringify(afterRaw)) continue

    const operation = !beforeExists ? 'added' : !afterExists ? 'removed' : 'changed'
    if (redactedFields.has(field)) {
      changes.push({
        field,
        operation,
        before: null,
        after: null,
        redacted: true,
      })
      continue
    }

    if (!visibleFields.has(field)) {
      hasHiddenChanges = true
      continue
    }

    const before = normalizeDisplayValue(beforeRaw)
    const after = normalizeDisplayValue(afterRaw)
    changes.push({
      field,
      operation,
      before: before.value,
      after: after.value,
      redacted: before.redacted || after.redacted,
    })
  }

  if (changes.length > MAX_USER_CHANGE_COUNT) {
    hasHiddenChanges = true
  }

  return {
    changes: changes.slice(0, MAX_USER_CHANGE_COUNT),
    hasHiddenChanges,
  }
}

export function mapUserAuditActivityResponse(
  log: AuditLogForSurface,
  viewerUserId: string
): UserAuditActivityResponse {
  const copy = getActivityCopy(log)
  const actor = toUserActor(log, viewerUserId)
  const { changes, hasHiddenChanges } = buildUserChanges(log, copy.category, viewerUserId)

  return {
    id: log.id ?? `${log.created_at}:${userActivityKey(log, copy.category)}`,
    category: copy.category,
    outcome: toActivityOutcome(log.outcome, log.stage),
    title: copy.title,
    description: copy.userDescription,
    occurredAt: log.source_occurred_at ?? log.created_at,
    activityKey: userActivityKey(log, copy.category),
    perspective: actor.perspective,
    actor: {
      type: actor.type,
      label: actor.label,
    },
    subject: {
      category: copy.category,
      label: copy.subjectLabel,
    },
    changes,
    changeCount: changes.length,
    hasHiddenChanges,
  }
}

export function mapOrganizationAuditActivityResponse(
  log: AuditLogForSurface
): OrganizationAuditActivityResponse {
  const copy = getActivityCopy(log)
  const actionCode = log.event_name?.trim() || log.action
  const actorType = toOrganizationActorType(log)
  const actorLabel = toActorLabel(log.user, log.actor_type)
  const changes = buildOrganizationChanges(log, copy.category)

  return {
    id: log.id ?? `${log.created_at}:${actionCode}`,
    category: copy.category,
    outcome: toActivityOutcome(log.outcome, log.stage),
    title: copy.title,
    description: copy.organizationDescription,
    occurredAt: log.source_occurred_at ?? log.created_at,
    actionCode,
    actionKey: normalizeActionKey(actionCode),
    actor: {
      type: actorType,
      label: actorLabel,
      roleLabel: log.actor_role_surface?.trim() || null,
    },
    target: {
      type: log.target_type?.trim() || log.resource_type,
      id: log.target_id ?? log.resource_id ?? null,
      label: targetLabel(log, copy.subjectLabel),
    },
    changes,
    changeCount: changes.length,
    actorLabel,
    subjectLabel: copy.subjectLabel,
  }
}
