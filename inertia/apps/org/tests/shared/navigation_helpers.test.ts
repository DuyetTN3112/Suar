import { describe, expect, it } from 'vitest'

import { organizationNavigationSections } from '@/apps/org/shared/components/navigation/organization_sections'
import {
  filterMainNavigationByRole,
  isNavUrlActive,
} from '@/apps/org/shared/components/navigation_helpers'
import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

function visibleUrlsFromGroups(groups: NavGroup[], role: string | null): string[] {
  return filterMainNavigationByRole(groups, role).flatMap((group) =>
    group.items.flatMap((item) =>
      'url' in item && item.url !== undefined ? [item.url] : item.items.map((child) => child.url)
    )
  )
}

describe('User-realm organization navigation filtering', () => {
  it('keeps an ordinary member on governance entry and project portfolio only', () => {
    expect(visibleUrlsFromGroups(organizationNavigationSections, 'org_member')).toEqual([
      '/org',
      '/org/projects',
    ])
  })

  it('shows governance actions to organization owners and admins', () => {
    for (const role of ['org_owner', 'org_admin']) {
      const urls = visibleUrlsFromGroups(organizationNavigationSections, role)

      expect(urls).toEqual(
        expect.arrayContaining([
          '/org',
          '/org/members',
          '/org/invitations',
          '/org/invitations/requests',
          '/org/roles',
          '/org/permissions',
          '/org/talents',
          '/org/bookmarks',
          '/org/settings',
          '/org/audit-logs',
          '/org/projects',
          '/org/projects/create',
        ])
      )
    }
  })

  it('never restores project execution boards in Organization Management', () => {
    const forbidden = [
      '/org/sprints',
      '/org/tasks/board',
      '/org/tasks/list',
      '/org/tasks/workflow',
      '/org/reviews/task-board',
      '/org/reviews/sprint-reverse-board',
      '/org/reverse-reviews',
      '/org/disputes',
      '/org/departments',
    ]

    for (const role of ['org_owner', 'org_admin', 'org_member']) {
      expect(visibleUrlsFromGroups(organizationNavigationSections, role)).toEqual(
        expect.not.arrayContaining(forbidden)
      )
    }
  })
})

describe('navigation active state', () => {
  it('does not mark the sprint workspace active for a project-specific sprint URL', () => {
    expect(isNavUrlActive('/org/sprints?projectId=project-1', '/org/sprints')).toBe(false)
    expect(
      isNavUrlActive('/org/sprints?projectId=project-1', '/org/sprints?projectId=project-1')
    ).toBe(true)
  })
})
