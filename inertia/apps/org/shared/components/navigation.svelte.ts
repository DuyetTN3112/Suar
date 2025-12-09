import { adminNavigationSections } from '@/apps/org/shared/components/navigation/admin_sections'
import { mainNavigationSections } from '@/apps/org/shared/components/navigation/main_sections'
import {
  buildOrganizationNavigationSections,
  organizationNavigationSections,
} from '@/apps/org/shared/components/navigation/organization_sections'
import type { CurrentProjectNavigationContext } from '@/apps/org/shared/components/navigation/organization_sections/projects'
import { filterMainNavigationByRole, mapNavGroup } from '@/apps/org/shared/components/navigation_helpers'
import type { BaseNavItem, NavCollapsible, NavGroup, NavItem, NavLink } from '@/apps/org/shared/components/navigation_types'
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

export function getOrganizationNavigationForRole(
  role: string | null,
  currentProject?: CurrentProjectNavigationContext | null
): NavGroup[] {
  const navigation = currentProject
    ? buildOrganizationNavigationSections(currentProject).map((group) => mapNavGroup(group))
    : organizationNavigation

  return filterMainNavigationByRole(navigation, role)
}

export type { NavGroup, NavItem, NavCollapsible, NavLink, BaseNavItem }
