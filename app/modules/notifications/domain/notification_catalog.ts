import {
  normalizeNotificationParameters,
  type NotificationJsonValue,
} from '#modules/notifications/domain/notification_limits'
import {
  BACKEND_NOTIFICATION_TYPES,
  type BackendNotificationType,
} from '#modules/notifications/public_contracts/notification_constants'

export type NotificationCategory =
  | 'organization'
  | 'project'
  | 'task'
  | 'review'
  | 'system'
  | 'legacy'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
export type NotificationPreferencePolicy = 'mandatory' | 'configurable'

export interface NotificationActionDescriptor {
  routeName: string
  params: Record<string, string>
}

export interface NotificationActionResolutionInput {
  recipientId: string
  scope:
    | { kind: 'user'; id: string }
    | { kind: 'organization'; id: string }
    | { kind: 'system' }
  subject?: { type: string; id: string }
  parameters: Record<string, unknown>
}

export interface NotificationDefinition {
  type: BackendNotificationType
  schemaVersion: 1
  category: Exclude<NotificationCategory, 'legacy'>
  priority: NotificationPriority
  templateKey: string
  templateVersion: number
  allowedChannels: readonly ['in_app']
  validateParameters: (value: unknown) => Record<string, NotificationJsonValue>
  resolveAction: (input: NotificationActionResolutionInput) => NotificationActionDescriptor | null
  retentionClass: string
  preferencePolicy: NotificationPreferencePolicy
}

export interface HistoricalNotificationDefinition {
  type: string
  category: 'legacy'
  priority: 'normal'
  action: null
  producible: false
}

const canonicalTypes = new Set<string>(Object.values(BACKEND_NOTIFICATION_TYPES))
const organizationCategoryTypes = new Set<BackendNotificationType>([
  BACKEND_NOTIFICATION_TYPES.MEMBER_ADDED,
  BACKEND_NOTIFICATION_TYPES.JOIN_REQUEST_APPROVED,
  BACKEND_NOTIFICATION_TYPES.JOIN_REQUEST_REJECTED,
  BACKEND_NOTIFICATION_TYPES.MEMBER_REMOVED,
  BACKEND_NOTIFICATION_TYPES.OWNERSHIP_TRANSFERRED,
  BACKEND_NOTIFICATION_TYPES.ROLE_CHANGED,
  BACKEND_NOTIFICATION_TYPES.ORGANIZATION,
])

function categoryFor(type: BackendNotificationType): Exclude<NotificationCategory, 'legacy'> {
  if (type.startsWith('organization_') || organizationCategoryTypes.has(type)) {
    return 'organization'
  }
  if (type.startsWith('project_')) {
    return 'project'
  }
  if (
    type.startsWith('review_') ||
    type.startsWith('reverse_review_') ||
    type === 'review'
  ) {
    return 'review'
  }
  if (
    type.startsWith('task_') ||
    type.startsWith('assignment_') ||
    type === 'task_application' ||
    type === 'task_application_review'
  ) {
    return 'task'
  }
  return 'system'
}

function priorityFor(type: BackendNotificationType): NotificationPriority {
  if (
    type.includes('overdue') ||
    type.includes('escalated') ||
    type.includes('access_revoked') ||
    type.includes('deactivated')
  ) {
    return 'urgent'
  }
  if (
    type.includes('rejected') ||
    type.includes('removed') ||
    type.includes('unassigned') ||
    type.includes('need_action')
  ) {
    return 'high'
  }
  return 'normal'
}

function resolveCatalogAction(
  input: NotificationActionResolutionInput
): NotificationActionDescriptor | null {
  const subject = input.subject
  if (!subject) {
    return null
  }

  const routes: Record<string, string> = {
    task: 'tasks.show',
    task_application: 'task_applications.show',
    organization: 'organizations.show',
    project: 'projects.show',
    project_sprint: 'project_sprints.show',
    user: 'users.show',
  }
  const routeName = routes[subject.type]
  if (!routeName) {
    return null
  }

  return {
    routeName,
    params: { id: subject.id },
  }
}

const definitions = Object.fromEntries(
  Object.values(BACKEND_NOTIFICATION_TYPES).map((type) => {
    const definition: NotificationDefinition = {
      type,
      schemaVersion: 1,
      category: categoryFor(type),
      priority: priorityFor(type),
      templateKey: `notifications.${type}`,
      templateVersion: 1,
      allowedChannels: ['in_app'],
      validateParameters: normalizeNotificationParameters,
      resolveAction:
        type === BACKEND_NOTIFICATION_TYPES.TASK_DELETED ||
        type === BACKEND_NOTIFICATION_TYPES.ACCOUNT_DEACTIVATED ||
        type === BACKEND_NOTIFICATION_TYPES.MEMBER_REMOVED ||
        type === BACKEND_NOTIFICATION_TYPES.JOIN_REQUEST_REJECTED
          ? () => null
          : resolveCatalogAction,
      retentionClass: 'notification_standard_180d',
      preferencePolicy:
        type === BACKEND_NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT ||
        type === BACKEND_NOTIFICATION_TYPES.ACCOUNT_VERIFIED ||
        type === BACKEND_NOTIFICATION_TYPES.ACCOUNT_DEACTIVATED
          ? 'mandatory'
          : 'configurable',
    }
    return [type, definition]
  })
) as Record<BackendNotificationType, NotificationDefinition>

export function isCanonicalNotificationType(type: string): type is BackendNotificationType {
  return canonicalTypes.has(type)
}

export function getNotificationDefinition(type: string): NotificationDefinition | undefined {
  return isCanonicalNotificationType(type) ? definitions[type] : undefined
}

export function getHistoricalNotificationDefinition(
  type: string
): HistoricalNotificationDefinition {
  return {
    type,
    category: 'legacy',
    priority: 'normal',
    action: null,
    producible: false,
  }
}

export const NOTIFICATION_CATALOG: Readonly<
  Record<BackendNotificationType, NotificationDefinition>
> = definitions
