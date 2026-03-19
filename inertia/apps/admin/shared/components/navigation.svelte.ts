import { adminNavigationSections } from '@/apps/admin/shared/components/navigation/admin_sections'
import { filterAdminNavigationByRole, mapNavGroup } from '@/apps/admin/shared/components/navigation_helpers'
import type { BaseNavItem, NavCollapsible, NavGroup, NavItem, NavLink } from '@/apps/admin/shared/components/navigation_types'

// System Admin Navigation
export const adminNavigation: NavGroup[] = adminNavigationSections.map((group) => mapNavGroup(group))

export function getAdminNavigationForRole(
  systemRole: string | null,
  systemPermissions: readonly string[] | null = null
): NavGroup[] {
  return filterAdminNavigationByRole(adminNavigation, systemRole, systemPermissions)
}

export type { NavGroup, NavItem, NavCollapsible, NavLink, BaseNavItem }
