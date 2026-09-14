import {
  type AuditActivityBaseResponse,
  type AuditActivityCategory,
  type AuditLogForSurface,
  asAuditRecord,
  eventFingerprint,
  getActivityCopy,
  normalizeDisplayValue,
  toActivityOutcome,
} from './audit_log_surface_shared.js'

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

export const MAX_USER_CHANGE_COUNT = 12

export const USER_VISIBLE_CHANGE_FIELDS: Partial<Record<AuditActivityCategory, ReadonlySet<string>>> = {
  account: new Set(['is_external_contributor', 'language', 'status', 'timezone', 'username']),
  access: new Set(['org_role', 'role', 'status']),
  membership: new Set(['org_role', 'role', 'status']),
  project: new Set(['status', 'visibility']),
  review: new Set(['outcome', 'status', 'visibility']),
  security: new Set(['method']),
  task: new Set(['priority', 'status', 'task_visibility']),
}

export const USER_REDACTED_CHANGE_FIELDS: Partial<Record<AuditActivityCategory, ReadonlySet<string>>> = {
  account: new Set(['address', 'avatar_url', 'bio', 'email', 'phone']),
}

export function userActivityKey(
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

export function toUserActor(
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

export function isViewerAccountTarget(log: AuditLogForSurface, viewerUserId: string): boolean {
  const targetType = log.target_type ?? log.resource_type
  const targetId = log.target_id ?? log.resource_id
  return targetType === 'user' && targetId === viewerUserId
}

export function buildUserChanges(
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
