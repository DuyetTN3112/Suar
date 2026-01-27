import { describe, expect, it } from 'vitest'

import { adminNavigationSections } from '@/apps/admin/shared/components/navigation/admin_sections'
import { filterAdminNavigationByRole } from '@/apps/admin/shared/components/navigation_helpers'
import type { NavGroup } from '@/apps/admin/shared/components/navigation_types'

function urlsForGroups(groups: NavGroup[]): string[] {
  return groups.flatMap((group) =>
    group.items.flatMap((item) =>
      'url' in item && item.url ? [item.url] : (item.items?.map((child) => child.url) ?? [])
    )
  )
}

function visibleSectionTitles(
  systemRole: string | null,
  systemPermissions: readonly string[] | null = null
): string[] {
  return filterAdminNavigationByRole(
    adminNavigationSections,
    systemRole,
    systemPermissions
  ).map((group) => group.title)
}

describe('isolated System Admin navigation', () => {
  it('owns only System Admin URL space', () => {
    expect(adminNavigationSections.map((group) => group.title)).toEqual([
      'Admin overview',
      'Subscription',
      'Users',
      'Organizations',
      'System',
    ])
    expect(urlsForGroups(adminNavigationSections).every((url) => url.startsWith('/admin'))).toBe(
      true
    )
  })

  it('filters custom System roles by System permission', () => {
    expect(visibleSectionTitles('registered_user')).toEqual([])
    expect(visibleSectionTitles(null)).toEqual([])
    expect(visibleSectionTitles('custom_empty_role', [])).toEqual([])
    expect(visibleSectionTitles('custom_audit_role', ['audit.read'])).toEqual(['System'])
    expect(visibleSectionTitles('custom_users_role', ['users.read'])).toEqual(['Users'])
    expect(visibleSectionTitles('system_admin')).toEqual([
      'Admin overview',
      'Subscription',
      'Users',
      'Organizations',
      'System',
    ])
  })

  it('contains the single System AI dispute board and no retired history/operator entry', () => {
    const urls = urlsForGroups(adminNavigationSections)

    expect(urls).toContain('/admin/disputes')
    expect(urls).not.toContain('/admin/disputes/ai-operator')
    expect(urls).not.toContain('/admin/reverse-reviews')
    expect(urls.some((url) => url.startsWith('/projects/'))).toBe(false)
    expect(urls.some((url) => url.startsWith('/org'))).toBe(false)
  })
})
