import { describe, expect, it } from 'vitest'

import {
  notificationInboxUrl,
  resolveNotificationDeepLink,
  type NotificationDeepLinkInput,
  type NotificationShell,
} from '@/apps/shared/notifications/notification_deep_links'

function item(overrides: Partial<NotificationDeepLinkInput> = {}): NotificationDeepLinkInput {
  return {
    type: 'task_updated',
    relatedEntityType: 'task',
    relatedEntityId: 'task-1',
    metadata: { projectId: 'project-1' },
    action: { routeName: 'tasks.show', params: { id: 'task-1' } },
    ...overrides,
  }
}

describe('notification deep-link resolver', () => {
  it('keeps inbox links inside the active shell', () => {
    expect(notificationInboxUrl('user')).toBe('/notifications')
    expect(notificationInboxUrl('org')).toBe('/org/notifications')
    expect(notificationInboxUrl('admin')).toBe('/admin/notifications')
  })

  it('resolves sprint-review notifications to the shell-local reverse-review board', () => {
    expect(
      resolveNotificationDeepLink(
        item({
          type: 'reverse_review_received',
          relatedEntityType: 'project_sprint',
          relatedEntityId: 'sprint-1',
          metadata: { projectId: 'project-1' },
          action: { routeName: 'project_sprints.show', params: { id: 'sprint-1' } },
        }),
        'user'
      )
    ).toEqual({
      url: '/projects/project-1/reviews/assigners?sprint_id=sprint-1',
      unresolvedReason: null,
    })
    expect(
      resolveNotificationDeepLink(
        item({
          type: 'reverse_review_received',
          relatedEntityType: 'project_sprint',
          relatedEntityId: 'sprint-1',
          metadata: { projectId: 'project-1', reviewType: 'environment' },
          action: { routeName: 'project_sprints.show', params: { id: 'sprint-1' } },
        }),
        'org'
      ).url
    ).toBe('/projects/project-1/reviews/environment?sprint_id=sprint-1')
  })

  it('does not manufacture a task URL from a task application id', () => {
    expect(
      resolveNotificationDeepLink(
        item({
          type: 'task_application',
          relatedEntityType: 'task_application',
          relatedEntityId: 'application-1',
          action: { routeName: 'task_applications.show', params: { id: 'application-1' } },
        }),
        'user'
      )
    ).toEqual({
      url: null,
      unresolvedReason: 'Notification is missing task id for task application',
    })
  })

  it('resolves task applications once the producer carries the task id', () => {
    expect(
      resolveNotificationDeepLink(
        item({
          type: 'task_application',
          relatedEntityType: 'task_application',
          relatedEntityId: 'application-1',
          metadata: { taskId: 'task-1', projectId: 'project-1' },
          action: { routeName: 'task_applications.show', params: { id: 'application-1' } },
        }),
        'org'
      )
    ).toEqual({
      url: '/projects/project-1/tasks?task_id=task-1&application_id=application-1',
      unresolvedReason: null,
    })
  })

  it('routes each backend notification subject to the expected shell-local URL', () => {
    const cases: Array<{
      shell: NotificationShell
      notification: NotificationDeepLinkInput
      url: string | null
    }> = [
      {
        shell: 'user',
        notification: item({ relatedEntityType: 'task', relatedEntityId: 'task-1' }),
        url: '/projects/project-1/tasks?task_id=task-1',
      },
      {
        shell: 'org',
        notification: item({ relatedEntityType: 'task', relatedEntityId: 'task-1' }),
        url: '/projects/project-1/tasks?task_id=task-1',
      },
      {
        shell: 'admin',
        notification: item({ relatedEntityType: 'task', relatedEntityId: 'task-1' }),
        url: null,
      },
      {
        shell: 'org',
        notification: item({ relatedEntityType: 'project', relatedEntityId: 'project-1' }),
        url: '/projects/project-1',
      },
      {
        shell: 'admin',
        notification: item({ relatedEntityType: 'project', relatedEntityId: 'project-1' }),
        url: null,
      },
      {
        shell: 'user',
        notification: item({
          type: 'reverse_review_received',
          relatedEntityType: 'project_sprint',
          relatedEntityId: 'sprint-1',
          metadata: { projectId: 'project-1' },
        }),
        url: '/projects/project-1/reviews/assigners?sprint_id=sprint-1',
      },
      {
        shell: 'org',
        notification: item({
          type: 'reverse_review_received',
          relatedEntityType: 'project_sprint',
          relatedEntityId: 'sprint-1',
          metadata: { projectId: 'project-1', reviewType: 'environment' },
        }),
        url: '/projects/project-1/reviews/environment?sprint_id=sprint-1',
      },
      {
        shell: 'user',
        notification: item({
          type: 'organization_invitation',
          relatedEntityType: 'organization',
          relatedEntityId: 'org-1',
          action: null,
        }),
        url: '/profile/invitations',
      },
      {
        shell: 'org',
        notification: item({
          type: 'organization_join_request',
          relatedEntityType: 'organization',
          relatedEntityId: 'org-1',
        }),
        url: '/org/invitations/requests',
      },
      {
        shell: 'user',
        notification: item({
          type: 'organization_join_request',
          relatedEntityType: 'organization',
          relatedEntityId: 'org-1',
        }),
        url: '/org/invitations/requests',
      },
      {
        shell: 'user',
        notification: item({ relatedEntityType: 'organization', relatedEntityId: 'org-1' }),
        url: '/organizations/org-1',
      },
      {
        shell: 'admin',
        notification: item({ relatedEntityType: 'organization', relatedEntityId: 'org-1' }),
        url: '/admin/organizations/org-1',
      },
      {
        shell: 'user',
        notification: item({ relatedEntityType: 'user', relatedEntityId: 'user-1' }),
        url: '/users/user-1/profile',
      },
      {
        shell: 'admin',
        notification: item({ relatedEntityType: 'user', relatedEntityId: 'user-1' }),
        url: '/admin/users/user-1',
      },
      {
        shell: 'org',
        notification: item({
          type: 'task_application',
          relatedEntityType: 'task_application',
          relatedEntityId: 'application-1',
          metadata: { taskId: 'task-1', projectId: 'project-1' },
        }),
        url: '/projects/project-1/tasks?task_id=task-1&application_id=application-1',
      },
      {
        shell: 'admin',
        notification: item({
          type: 'task_application',
          relatedEntityType: 'task_application',
          relatedEntityId: 'application-1',
          metadata: { taskId: 'task-1', projectId: 'project-1' },
        }),
        url: null,
      },
    ]

    for (const { shell, notification, url } of cases) {
      const result = resolveNotificationDeepLink(notification, shell)
      expect(result.url).toBe(url)
      expect(result.unresolvedReason === null).toBe(url !== null)
    }
  })
})
