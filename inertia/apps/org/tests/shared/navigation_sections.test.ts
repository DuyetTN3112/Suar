import { describe, expect, it } from 'vitest'

import { mainNavigationSections as orgMainNavigationSections } from '@/apps/org/shared/components/navigation/main_sections'
import {
  buildOrganizationNavigationSections,
  organizationNavigationSections,
} from '@/apps/org/shared/components/navigation/organization_sections'
import {
  buildOrganizationProjectsSection,
  organizationProjectsSection,
} from '@/apps/org/shared/components/navigation/organization_sections/projects'
import { getOrganizationNavigationForRole } from '@/apps/org/shared/components/navigation.svelte'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
import { mainNavigationSections as userMainNavigationSections } from '@/apps/user/shared/components/navigation/main_sections'
import { organizationNavigationSections as userOrganizationNavigationSections } from '@/apps/user/shared/components/navigation/organization_sections'
import { buildProjectNavigationSections } from '@/apps/user/shared/components/navigation/project_sections'

interface NavigationChildLike {
  title: string
  url?: string
}

interface NavigationItemLike extends NavigationChildLike {
  items?: NavigationChildLike[]
}

interface NavigationGroupLike {
  title: string
  items: NavigationItemLike[]
}

function urlsForSection(title: string): string[] {
  const section = organizationNavigationSections.find((group) => group.title === title)

  return (
    section?.items.flatMap((item) => {
      if ('url' in item && item.url) {
        return [item.url]
      }

      return item.items?.flatMap((child) => (child.url ? [child.url] : [])) ?? []
    }) ?? []
  )
}

function urlsForGroups(groups: NavigationGroupLike[]): string[] {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => {
      if ('url' in item && item.url) {
        return [item.url]
      }

      return item.items?.flatMap((child) => (child.url ? [child.url] : [])) ?? []
    })
  )
}

function itemTitlesForGroup(group: NavigationGroupLike): string[] {
  return group.items.map((item) => item.title)
}

function childTitlesForGroup(group: NavigationGroupLike): string[] {
  return group.items.flatMap((item) => {
    if ('url' in item && item.url) {
      return [item.title]
    }

    return item.items?.map((child) => child.title) ?? []
  })
}

function requiredGroup(groups: NavigationGroupLike[], title: string): NavigationGroupLike {
  const group = groups.find((item) => item.title === title)
  expect(group).toBeDefined()

  if (!group) {
    throw new Error(`Missing navigation group ${title}`)
  }

  return group
}

describe('main app navigation sections', () => {
  it('keeps organization discovery as flat sidebar links', () => {
    const variants = [orgMainNavigationSections, userMainNavigationSections]

    for (const groups of variants) {
      const organizationDiscovery = requiredGroup(groups, 'Discover organizations')

      expect(itemTitlesForGroup(organizationDiscovery)).toEqual(['Organizations', 'Projects'])
      expect(urlsForGroups([organizationDiscovery])).toEqual(['/organizations', '/projects'])
    }
  })

  it('keeps project boards out of the personal navigation', () => {
    expect(userMainNavigationSections.map((group) => group.title)).not.toContain('Reviews')
    expect(urlsForGroups(userMainNavigationSections)).not.toEqual(
      expect.arrayContaining([
        '/tasks',
        '/reviews/task-board',
        '/reviews/pending',
        '/reviews/sprint-reverse-board?review_type=manager',
        '/reviews/sprint-reverse-board?review_type=environment',
      ])
    )
  })

  it('keeps the org review section exposing the organization applications inbox', () => {
    const reviewsGroup = requiredGroup(orgMainNavigationSections, 'Reviews')

    expect(childTitlesForGroup(reviewsGroup)).toEqual([
      'Organization applications',
      'My applications',
    ])
    expect(urlsForGroups([reviewsGroup])).toEqual(['/org/applications', '/my-applications'])

    const reviewChildren = reviewsGroup.items.flatMap((item) => item.items ?? [])
    expect(reviewChildren).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          titleKey: 'common.navigation.organization_applications',
          url: '/org/applications',
        }),
      ])
    )
  })
})

describe('organization workspace navigation sections', () => {
  it('keeps organization governance separate from project operations', () => {
    expect(organizationNavigationSections.map((group) => group.title)).toEqual([
      'Organization management',
      'Project portfolio',
    ])
  })

  it('keeps both User-realm bundles on the same two governance domains', () => {
    const expectedTitles = ['Organization management', 'Project portfolio']

    expect(userOrganizationNavigationSections.map((group) => group.title)).toEqual(expectedTitles)
  })

  it('keeps organization management free of project boards and review archives', () => {
    expect(urlsForSection('Organization management')).toEqual(
      expect.arrayContaining([
        FRONTEND_ROUTES.ORG_HOME,
        FRONTEND_ROUTES.ORG_MEMBERS,
        FRONTEND_ROUTES.ORG_INVITATIONS,
        FRONTEND_ROUTES.ORG_INVITATION_REQUESTS,
        FRONTEND_ROUTES.ORG_ROLES,
        FRONTEND_ROUTES.ORG_PERMISSIONS,
        FRONTEND_ROUTES.ORG_MARKETPLACE_TASKS,
        FRONTEND_ROUTES.ORG_TALENTS,
        FRONTEND_ROUTES.ORG_BOOKMARKS,
        FRONTEND_ROUTES.ORG_AUDIT_LOGS,
      ])
    )
    expect(urlsForSection('Organization management')).not.toContain(FRONTEND_ROUTES.ORG_SETTINGS)
    expect(urlsForSection('Organization management')).not.toContain('/org/reverse-reviews')
    expect(urlsForSection('Organization management')).not.toContain('/org/disputes')
    expect(urlsForSection('Organization management')).not.toContain(FRONTEND_ROUTES.ORG_DEPARTMENTS)
  })

  it('keeps only project portfolio operations in organization navigation', () => {
    expect(urlsForSection('Project portfolio')).toEqual(
      expect.arrayContaining([FRONTEND_ROUTES.ORG_PROJECTS, FRONTEND_ROUTES.ORG_PROJECTS_CREATE])
    )
    const urls = urlsForSection('Project portfolio')
    expect(urls).not.toContain('/org/tasks/board')
    expect(urls).not.toContain('/org/tasks/list')
    expect(urls).not.toContain('/org/sprints')
    expect(urls).not.toContain('/org/reviews/task-board')
    expect(urls).not.toContain('/org/reverse-reviews')
    expect(urls).not.toContain('/org/disputes')
  })

  it('does not re-expand organization navigation when a project is current', () => {
    const groups = buildOrganizationNavigationSections()
    const urls = urlsForGroups(groups)
    const duplicateUrls = [...new Set(urls.filter((url, index) => urls.indexOf(url) !== index))]

    expect(duplicateUrls).toEqual([])
    expect(urls.some((url) => url.startsWith('/projects/project-1'))).toBe(false)
    expect(urls.some((url) => url.includes('/reviews/'))).toBe(false)
    expect(urls).not.toContain('/org/tasks/board')
    expect(urls).not.toContain('/org/tasks/list')
    expect(urlsForGroups(getOrganizationNavigationForRole('org_owner'))).toEqual(urls)
  })
})

describe('organization project navigation section', () => {
  it('keeps project navigation portfolio-only', () => {
    const urls = organizationProjectsSection.items.flatMap((item) => {
      if ('url' in item && item.url) {
        return [item.url]
      }

      return item.items?.map((child) => child.url) ?? []
    })

    expect(urls).toContain('/org/projects')
    expect(urls).toContain('/org/projects/create')
    expect(urls).not.toContain('/org/sprints')
    expect(urls.some((url) => url.includes('/reviews/'))).toBe(false)
    expect(childTitlesForGroup(buildOrganizationProjectsSection())).toEqual([
      'Project portfolio',
      'Create project',
    ])
  })
})

describe('project workspace navigation', () => {
  it('exposes exactly the four shared project boards', () => {
    const groups = buildProjectNavigationSections({ id: 'project-1', name: 'Apollo' })
    const boards = requiredGroup(groups, 'Project boards')

    expect(urlsForGroups([boards])).toEqual([
      '/projects/project-1/tasks',
      '/projects/project-1/reviews/tasks',
      '/projects/project-1/reviews/assigners',
      '/projects/project-1/reviews/environment',
    ])
  })

  it('does not expose personal or organization workspace navigation', () => {
    const groups = buildProjectNavigationSections({ id: 'project-1', name: 'Apollo' })
    const urls = urlsForGroups(groups)

    expect(groups.map((group) => group.title)).toEqual(['Apollo', 'Project boards'])
    expect(urls).not.toContain('/org/projects')
    expect(urls).not.toContain('/org')
  })
})
