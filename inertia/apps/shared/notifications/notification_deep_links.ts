export type NotificationShell = 'user' | 'org' | 'admin'

export interface NotificationDeepLinkAction {
  routeName: string
  params: Record<string, string>
}

export interface NotificationDeepLinkInput {
  type: string
  relatedEntityType: string | null
  relatedEntityId: string | null
  metadata: Record<string, unknown> | null
  action: NotificationDeepLinkAction | null
}

export interface NotificationDeepLinkResult {
  url: string | null
  unresolvedReason: string | null
}

const SHELL_PREFIX: Record<NotificationShell, string> = {
  user: '',
  org: '/org',
  admin: '/admin',
}

export const NOTIFICATION_RESOLVABLE_ENTITY_TYPES = [
  'task',
  'organization',
  'project',
  'project_sprint',
  'user',
  'task_application',
] as const

type ResolvableNotificationEntityType = (typeof NOTIFICATION_RESOLVABLE_ENTITY_TYPES)[number]

export function notificationInboxUrl(shell: NotificationShell): string {
  return `${SHELL_PREFIX[shell]}/notifications`
}

function encoded(value: string): string {
  return encodeURIComponent(value)
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return null
}

function param(notification: NotificationDeepLinkInput, key: string): string | null {
  return firstString(notification.action?.params[key], notification.metadata?.[key])
}

function entityId(notification: NotificationDeepLinkInput): string | null {
  return firstString(notification.relatedEntityId, notification.action?.params['id'])
}

function projectId(notification: NotificationDeepLinkInput): string | null {
  return firstString(param(notification, 'projectId'), param(notification, 'project_id'))
}

function withReason(reason: string): NotificationDeepLinkResult {
  return { url: null, unresolvedReason: reason }
}

function route(prefix: string, path: string): NotificationDeepLinkResult {
  return { url: `${prefix}${path}`, unresolvedReason: null }
}

function resolveEntity(
  entityType: ResolvableNotificationEntityType,
  notification: NotificationDeepLinkInput,
  shell: NotificationShell
): NotificationDeepLinkResult {
  const id = entityId(notification)

  if (entityType !== 'organization' && !id) {
    return withReason(`Notification is missing ${entityType} id`)
  }

  if (
    shell === 'admin' &&
    ['task', 'project', 'project_sprint', 'task_application'].includes(entityType)
  ) {
    return withReason('Project subjects are not available in the System Admin workspace')
  }

  switch (entityType) {
    case 'task': {
      const ownerProjectId = projectId(notification)
      if (!ownerProjectId) {
        return withReason('Notification is missing project id for task board navigation')
      }
      return route(
        '',
        `/projects/${encoded(ownerProjectId)}/tasks?task_id=${encoded(id as string)}`
      )
    }
    case 'project':
      return route('', `/projects/${encoded(id as string)}`)
    case 'project_sprint': {
      const ownerProjectId = projectId(notification)
      if (!ownerProjectId) {
        return withReason('Notification is missing project id for review board navigation')
      }
      const reviewType = firstString(
        param(notification, 'reviewType'),
        param(notification, 'review_type')
      )
      const board = reviewType === 'environment' ? 'environment' : 'assigners'
      return route(
        '',
        `/projects/${encoded(ownerProjectId)}/reviews/${board}?sprint_id=${encoded(id as string)}`
      )
    }
    case 'task_application': {
      const taskId = firstString(param(notification, 'taskId'), param(notification, 'task_id'))
      if (!taskId) {
        return withReason('Notification is missing task id for task application')
      }
      const ownerProjectId = projectId(notification)
      if (!ownerProjectId) {
        return withReason('Notification is missing project id for task application')
      }
      return route(
        '',
        `/projects/${encoded(ownerProjectId)}/tasks?task_id=${encoded(taskId)}&application_id=${encoded(id as string)}`
      )
    }
    case 'organization':
      if (notification.type === 'organization_join_request') {
        return route('/org', '/invitations/requests')
      }
      if (notification.type.includes('invitation')) {
        return route('', '/profile/invitations')
      }
      if (id) {
        return shell === 'admin'
          ? route('/admin', `/organizations/${encoded(id)}`)
          : shell === 'org'
            ? route('', '/org')
            : route('', `/organizations/${encoded(id)}`)
      }
      return withReason('Notification is missing organization id')
    case 'user':
      return shell === 'admin'
        ? route('/admin', `/users/${encoded(id as string)}`)
        : route('', `/users/${encoded(id as string)}/profile`)
  }
}

function entityTypeFromRouteName(routeName: string): ResolvableNotificationEntityType | null {
  switch (routeName) {
    case 'tasks.show':
      return 'task'
    case 'projects.show':
      return 'project'
    case 'project_sprints.show':
      return 'project_sprint'
    case 'task_applications.show':
      return 'task_application'
    case 'organizations.show':
      return 'organization'
    case 'users.show':
      return 'user'
    default:
      return null
  }
}

export function resolveNotificationDeepLink(
  notification: NotificationDeepLinkInput,
  shell: NotificationShell
): NotificationDeepLinkResult {
  const entityType =
    notification.relatedEntityType ??
    (notification.action ? entityTypeFromRouteName(notification.action.routeName) : null)

  if (
    entityType &&
    NOTIFICATION_RESOLVABLE_ENTITY_TYPES.includes(entityType as ResolvableNotificationEntityType)
  ) {
    return resolveEntity(entityType as ResolvableNotificationEntityType, notification, shell)
  }

  if (notification.type.startsWith('task_')) {
    return withReason('Task notification is missing a resolvable task subject')
  }

  return withReason('Notification has no resolvable subject')
}
