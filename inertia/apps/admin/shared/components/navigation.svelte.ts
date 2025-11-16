import { adminNavigationSections } from '@/apps/admin/shared/components/navigation/admin_sections'
import { mainNavigationSections } from '@/apps/admin/shared/components/navigation/main_sections'
import { organizationNavigationSections } from '@/apps/admin/shared/components/navigation/organization_sections'
import { filterMainNavigationByRole, mapNavGroup } from '@/apps/admin/shared/components/navigation_helpers'
import type { BaseNavItem, NavCollapsible, NavGroup, NavItem, NavLink } from '@/apps/admin/shared/components/navigation_types'
export const mainNavigation: NavGroup[] = mainNavigationSections.map((group) => mapNavGroup(group))

export function getMainNavigationForRole(role: string | null): NavGroup[] {
  return filterMainNavigationByRole(mainNavigation, role)
}

// System Admin Navigation
export const adminNavigation: NavGroup[] = adminNavigationSections.map((group) => mapNavGroup(group))

// Organization Admin Navigation
export const organizationNavigation: NavGroup[] = organizationNavigationSections.map((group) =>
  mapNavGroup(group)
)

export function getOrganizationNavigationForRole(role: string | null): NavGroup[] {
  return filterMainNavigationByRole(organizationNavigation, role)
}

export type { NavGroup, NavItem, NavCollapsible, NavLink, BaseNavItem }
