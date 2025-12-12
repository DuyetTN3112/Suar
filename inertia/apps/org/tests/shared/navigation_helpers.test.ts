import { describe, expect, it } from 'vitest'

import {
  filterMainNavigationByRole,
  isNavUrlActive,
} from '@/apps/org/shared/components/navigation_helpers'
import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

const navigation: NavGroup[] = [
  {
    title: 'Primary',
    items: [
      {
        title: 'Overview',
        url: '/org',
      },
      {
        title: 'Projects',
        url: '/projects',
      },
      {
        title: 'Org Projects',
        url: '/org/projects',
      },
      {
        title: 'Org Sprints',
        url: '/org/sprints',
      },
      {
        title: 'Members',
        url: '/org/members',
      },
      {
        title: 'Tasks',
        url: '/tasks',
      },
      {
        title: 'Org Tasks',
        url: '/org/tasks/list',
      },
      {
        title: 'Org Marketplace Tasks',
        url: '/org/marketplace/tasks',
      },
      {
        title: 'Org Task Review Board',
        url: '/org/reviews/task-board',
      },
      {
        title: 'Org Reverse Reviews',
        url: '/org/reverse-reviews',
      },
    ],
  },
]

function visibleUrls(role: string | null): string[] {
  return filterMainNavigationByRole(navigation, role).flatMap((group) =>
    group.items.flatMap((item) =>
      'url' in item && item.url !== undefined ? [item.url] : item.items.map((child) => child.url)
    )
  )
}

describe('navigation role filtering', () => {
  it('keeps board links for regular organization members without exposing archive pages', () => {
    expect(visibleUrls('org_member')).toContain('/projects')
    expect(visibleUrls('org_member')).toContain('/org/projects')
    expect(visibleUrls('org_member')).toContain('/org/sprints')
    expect(visibleUrls('org_member')).toContain('/tasks')
    expect(visibleUrls('org_member')).toContain('/org/tasks/list')
    expect(visibleUrls('org_member')).toContain('/org/marketplace/tasks')
    expect(visibleUrls('org_member')).toContain('/org/reviews/task-board')
    expect(visibleUrls('org_member')).not.toContain('/org/reverse-reviews')
  })

  it('keeps organization home for regular organization members', () => {
    expect(visibleUrls('org_member')).toContain('/org')
  })

  it('shows organization management links to organization owners', () => {
    expect(visibleUrls('org_owner')).toContain('/org/members')
  })
})

describe('navigation active state', () => {
  it('does not mark the sprint workspace active for a project-specific sprint URL', () => {
    expect(isNavUrlActive('/org/sprints?projectId=project-1', '/org/sprints')).toBe(false)
    expect(isNavUrlActive('/org/sprints?projectId=project-1', '/org/sprints?projectId=project-1')).toBe(true)
  })
})
