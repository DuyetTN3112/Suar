import { describe, expect, it } from 'vitest'

import { adminNavigationSections as adminAppAdminNavigationSections } from '@/apps/admin/shared/components/navigation/admin_sections'
import { mainNavigationSections as adminMainNavigationSections } from '@/apps/admin/shared/components/navigation/main_sections'
import { organizationNavigationSections as adminOrganizationNavigationSections } from '@/apps/admin/shared/components/navigation/organization_sections'
import { adminNavigationSections as orgAdminNavigationSections } from '@/apps/org/shared/components/navigation/admin_sections'
import { mainNavigationSections as orgMainNavigationSections } from '@/apps/org/shared/components/navigation/main_sections'
import {
  buildOrganizationNavigationSections,
  organizationNavigationSections,
} from '@/apps/org/shared/components/navigation/organization_sections'
import {
  buildOrganizationProjectsSection,
  organizationProjectsSection,
} from '@/apps/org/shared/components/navigation/organization_sections/projects'
import { buildOrganizationSprintsSection } from '@/apps/org/shared/components/navigation/organization_sections/sprints'
import { getOrganizationNavigationForRole } from '@/apps/org/shared/components/navigation.svelte'
import { isNavUrlActive } from '@/apps/org/shared/components/navigation_helpers'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
import { adminNavigationSections as userAdminNavigationSections } from '@/apps/user/shared/components/navigation/admin_sections'
import { mainNavigationSections as userMainNavigationSections } from '@/apps/user/shared/components/navigation/main_sections'
import { organizationNavigationSections as userOrganizationNavigationSections } from '@/apps/user/shared/components/navigation/organization_sections'

const ORG_MANAGER_REVIEW_BOARD = '/org/reviews/sprint-reverse-board?review_type=manager'
const ORG_WORK_ENVIRONMENT_REVIEW_BOARD =
  '/org/reviews/sprint-reverse-board?review_type=environment'

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

describe('system admin navigation sections', () => {
  it('keeps subscription surfaces in their own admin sidebar domain', () => {
    const variants = [
      adminAppAdminNavigationSections,
      orgAdminNavigationSections,
      userAdminNavigationSections,
    ]

    for (const groups of variants) {
      expect(groups.map((group) => group.title)).toEqual([
        'Tổng Quan',
        'Subscription',
        'Người Dùng',
        'Tổ Chức',
        'Hệ Thống',
      ])

      const subscriptionGroup = requiredGroup(groups, 'Subscription')
      expect(childTitlesForGroup(subscriptionGroup)).toEqual([
        'Dashboard gói đăng ký',
        'Gói dịch vụ',
        'QR gói cá nhân',
      ])
      expect(urlsForGroups([subscriptionGroup])).toEqual([
        '/admin/dashboards/subscriptions',
        '/admin/packages',
        '/admin/qr-codes',
      ])

      expect(urlsForGroups([requiredGroup(groups, 'Tổng Quan')])).not.toContain(
        '/admin/dashboards/subscriptions'
      )
      expect(childTitlesForGroup(requiredGroup(groups, 'Hệ Thống'))).not.toEqual(
        expect.arrayContaining(['Gói dịch vụ', 'QR gói cá nhân'])
      )
    }
  })
})

describe('main app navigation sections', () => {
  it('keeps organization discovery as flat sidebar links', () => {
    const variants = [
      adminMainNavigationSections,
      orgMainNavigationSections,
      userMainNavigationSections,
    ]

    for (const groups of variants) {
      const organizationDiscovery = requiredGroup(groups, 'Khám phá tổ chức')

      expect(itemTitlesForGroup(organizationDiscovery)).toEqual(['Tổ chức', 'Dự án'])
      expect(urlsForGroups([organizationDiscovery])).toEqual(['/organizations', '/projects'])
    }
  })
})

describe('organization workspace navigation sections', () => {
  it('keeps the org sidebar organized around four management domains', () => {
    expect(organizationNavigationSections.map((group) => group.title)).toEqual([
      'Quản lý tổ chức',
      'Quản lý project',
      'Quản lý sprint',
      'Quản lý task',
    ])
  })

  it('keeps every organization sidebar variant on the same four domains', () => {
    const expectedTitles = ['Quản lý tổ chức', 'Quản lý project', 'Quản lý sprint', 'Quản lý task']

    expect(adminOrganizationNavigationSections.map((group) => group.title)).toEqual(expectedTitles)
    expect(userOrganizationNavigationSections.map((group) => group.title)).toEqual(expectedTitles)
  })

  it('groups organization operations under organization management without project sprint reviews', () => {
    expect(urlsForSection('Quản lý tổ chức')).toEqual(
      expect.arrayContaining([
        FRONTEND_ROUTES.ORG_HOME,
        FRONTEND_ROUTES.ORG_MEMBERS,
        FRONTEND_ROUTES.ORG_INVITATIONS,
        FRONTEND_ROUTES.ORG_INVITATION_REQUESTS,
        FRONTEND_ROUTES.ORG_DEPARTMENTS,
        FRONTEND_ROUTES.ORG_ROLES,
        FRONTEND_ROUTES.ORG_PERMISSIONS,
        FRONTEND_ROUTES.ORG_TALENTS,
        FRONTEND_ROUTES.ORG_BOOKMARKS,
        FRONTEND_ROUTES.ORG_SETTINGS,
        FRONTEND_ROUTES.ORG_AUDIT_LOGS,
      ])
    )
    expect(urlsForSection('Quản lý tổ chức')).not.toContain(ORG_MANAGER_REVIEW_BOARD)
    expect(urlsForSection('Quản lý tổ chức')).not.toContain(ORG_WORK_ENVIRONMENT_REVIEW_BOARD)
    expect(urlsForSection('Quản lý tổ chức')).not.toContain(FRONTEND_ROUTES.ORG_REVERSE_REVIEWS)
    expect(urlsForSection('Quản lý tổ chức')).not.toContain(FRONTEND_ROUTES.ORG_DISPUTES)
  })

  it('places sprint review boards in current project navigation without duplicating archives', () => {
    const projectGroup = buildOrganizationProjectsSection({
      id: 'project-1',
      name: 'Apollo',
    })
    const reviewTitles = childTitlesForGroup(projectGroup)
    const urls = urlsForGroups([projectGroup])

    expect(reviewTitles).toContain('Review quản lý')
    expect(reviewTitles).toContain('Review môi trường làm việc')
    expect(reviewTitles).not.toContain('Lịch sử review môi trường')
    expect(reviewTitles).not.toContain('Tranh chấp review')
    expect(urls).toContain(ORG_MANAGER_REVIEW_BOARD)
    expect(urls).toContain(ORG_WORK_ENVIRONMENT_REVIEW_BOARD)
    expect(urls).not.toContain(FRONTEND_ROUTES.ORG_REVERSE_REVIEWS)
    expect(urls).not.toContain(FRONTEND_ROUTES.ORG_DISPUTES)
    expect(urls).not.toContain(FRONTEND_ROUTES.ORG_SPRINT_REVERSE_REVIEW_BOARD)
  })

  it('keeps manager and work-environment review board sidebar active states separate', () => {
    expect(
      isNavUrlActive(
        '/org/reviews/sprint-reverse-board?review_type=manager&sprint_id=sprint-1',
        ORG_MANAGER_REVIEW_BOARD
      )
    ).toBe(true)
    expect(
      isNavUrlActive(
        '/org/reviews/sprint-reverse-board?review_type=manager&sprint_id=sprint-1',
        ORG_WORK_ENVIRONMENT_REVIEW_BOARD
      )
    ).toBe(false)
    expect(
      isNavUrlActive(
        '/org/reviews/sprint-reverse-board?review_type=environment&sprint_id=sprint-1',
        ORG_WORK_ENVIRONMENT_REVIEW_BOARD
      )
    ).toBe(true)
  })

  it('groups project portfolio operations under project management', () => {
    expect(urlsForSection('Quản lý project')).toEqual(
      expect.arrayContaining([FRONTEND_ROUTES.ORG_PROJECTS, FRONTEND_ROUTES.ORG_PROJECTS_CREATE])
    )
  })

  it('expands project management around current project operations', () => {
    const section = buildOrganizationProjectsSection({
      id: 'project-1',
      name: 'Apollo',
    })
    const urls = urlsForGroups([section])

    expect(urls).toEqual(
      expect.arrayContaining([
        FRONTEND_ROUTES.ORG_PROJECTS,
        FRONTEND_ROUTES.ORG_PROJECTS_CREATE,
        '/org/projects/project-1?focus=details',
        '/org/projects/project-1?focus=members',
        '/org/projects/project-1?focus=skills',
        '/org/projects/project-1?focus=roles',
        '/org/projects/project-1?focus=operating_model',
        '/org/projects/project-1?focus=sprints',
        ORG_MANAGER_REVIEW_BOARD,
        ORG_WORK_ENVIRONMENT_REVIEW_BOARD,
      ])
    )
    expect(urls).not.toContain(FRONTEND_ROUTES.ORG_REVERSE_REVIEWS)
    expect(urls).not.toContain(FRONTEND_ROUTES.ORG_DISPUTES)
    expect(urls).not.toContain('/org/tasks/list?project_id=project-1')
    expect(urls).not.toContain('/org/sprints?projectId=project-1')
    expect(childTitlesForGroup(section)).toContain('Vai trò project & phân công')
    expect(childTitlesForGroup(section)).toContain('Sprint của project')
    expect(childTitlesForGroup(section)).not.toContain('Roles & staffing')
    expect(itemTitlesForGroup(section)).not.toContain('Vận hành project')
  })

  it('builds role-filtered org navigation with current project links', () => {
    const urls = urlsForGroups(
      getOrganizationNavigationForRole('org_owner', {
        id: 'project-1',
        name: 'Apollo',
      })
    )

    expect(urls).toContain('/org/projects/project-1?focus=roles')
    expect(urls).toContain('/org/projects/project-1?focus=sprints')
    expect(urls).toContain(ORG_MANAGER_REVIEW_BOARD)
    expect(urls).not.toContain('/org/tasks/list?project_id=project-1')
  })

  it('groups sprint operations under sprint management', () => {
    expect(urlsForSection('Quản lý sprint')).toEqual(
      expect.arrayContaining([FRONTEND_ROUTES.ORG_SPRINTS])
    )
    expect(urlsForSection('Quản lý sprint')).not.toContain(
      FRONTEND_ROUTES.ORG_SPRINT_REVERSE_REVIEW_BOARD
    )
    expect(urlsForSection('Quản lý sprint')).not.toContain(ORG_MANAGER_REVIEW_BOARD)
    expect(urlsForSection('Quản lý sprint')).not.toContain(ORG_WORK_ENVIRONMENT_REVIEW_BOARD)
    expect(urlsForSection('Quản lý sprint')).not.toContain(FRONTEND_ROUTES.ORG_DISPUTES)
  })

  it('keeps sprint management focused on cross-project coordination', () => {
    const section = buildOrganizationSprintsSection({
      id: 'project-1',
      name: 'Apollo',
    })
    const urls = urlsForGroups([section])

    expect(urls).toEqual(expect.arrayContaining([FRONTEND_ROUTES.ORG_SPRINTS]))
    expect(urls).not.toContain('/org/projects/project-1?focus=sprints')
    expect(urls).not.toContain('/org/sprints?projectId=project-1')
    expect(urls).not.toContain('/org/tasks/board?project_id=project-1')
    expect(urls).not.toContain('/org/tasks/list?project_id=project-1')
    expect(urls).not.toContain(FRONTEND_ROUTES.ORG_SPRINT_REVERSE_REVIEW_BOARD)
    expect(urls).not.toContain(ORG_MANAGER_REVIEW_BOARD)
    expect(urls).not.toContain(ORG_WORK_ENVIRONMENT_REVIEW_BOARD)
    expect(urls).not.toContain(FRONTEND_ROUTES.ORG_DISPUTES)
  })

  it('groups task operations under task management', () => {
    expect(urlsForSection('Quản lý task')).toEqual(
      expect.arrayContaining([
        FRONTEND_ROUTES.ORG_TASKS_BOARD,
        FRONTEND_ROUTES.ORG_TASKS_LIST,
        FRONTEND_ROUTES.ORG_TASKS_WORKFLOW,
        FRONTEND_ROUTES.ORG_MARKETPLACE_TASKS,
        FRONTEND_ROUTES.ORG_TASK_REVIEW_BOARD,
      ])
    )
    expect(urlsForSection('Quản lý task')).not.toContain(FRONTEND_ROUTES.ORG_REVERSE_REVIEWS)
    expect(urlsForSection('Quản lý task')).not.toContain(FRONTEND_ROUTES.ORG_DISPUTES)
  })

  it('does not duplicate concrete navigation URLs across org sidebar domains', () => {
    const urls = urlsForGroups(organizationNavigationSections)
    const duplicateUrls = [...new Set(urls.filter((url, index) => urls.indexOf(url) !== index))]

    expect(duplicateUrls).toEqual([])
  })

  it('does not duplicate current project sprint navigation across sidebar domains', () => {
    const groups = buildOrganizationNavigationSections({
      id: 'project-1',
      name: 'Apollo',
    })
    const urls = urlsForGroups(groups)
    const duplicateUrls = [...new Set(urls.filter((url, index) => urls.indexOf(url) !== index))]
    const sprintSection = groups.find((group) => group.title === 'Quản lý sprint')

    expect(duplicateUrls).toEqual([])
    expect(urls.filter((url) => url === '/org/projects/project-1?focus=sprints')).toHaveLength(1)
    expect(sprintSection ? childTitlesForGroup(sprintSection) : []).toEqual(['Sprint workspace'])
  })
})

describe('organization project navigation section', () => {
  it('keeps generic project navigation portfolio-only when no project is active', () => {
    const urls = organizationProjectsSection.items.flatMap((item) => {
      if ('url' in item && item.url) {
        return [item.url]
      }

      return item.items?.map((child) => child.url) ?? []
    })

    expect(urls).toContain('/org/projects')
    expect(urls).toContain('/org/projects/create')
    expect(urls).not.toContain('/org/sprints')
    expect(urls).not.toContain(ORG_MANAGER_REVIEW_BOARD)
  })
})
