import {
  type AuditActivityBaseResponse,
  type AuditActivityCategory,
  type AuditLogForSurface,
  asAuditRecord,
  getActivityCopy,
  MAX_DISPLAY_VALUE_LENGTH,
  normalizeDisplayValue,
  toActivityOutcome,
  toActorLabel,
} from './audit_log_surface_shared.js'

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

export type OrganizationActorType = OrganizationAuditActivityResponse['actor']['type']
export type OrganizationAuditChange = OrganizationAuditActivityResponse['changes'][number]
export type OrganizationAuditValue = OrganizationAuditChange['before']

export const SAFE_CHANGE_FIELDS: Partial<Record<AuditActivityCategory, ReadonlySet<string>>> = {
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

export function asCustomRolePermissionMap(value: unknown): Map<string, string> {
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

export function buildCustomRoleChanges(
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

export function buildOrganizationChanges(
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

export function toOrganizationActorType(log: AuditLogForSurface): OrganizationActorType {
  if (log.actor_type === 'user') return log.user ? 'user' : 'deleted_user'
  if (log.actor_type === 'automation' || log.actor_type === 'service') return 'automation'
  if (log.actor_type === 'integration') return 'integration'
  if (log.actor_type === 'system') return 'system'
  if (log.user) return 'user'
  return 'unknown'
}

export function normalizeActionKey(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || 'recorded'
}

export function targetLabel(log: AuditLogForSurface, fallback: string): string {
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
