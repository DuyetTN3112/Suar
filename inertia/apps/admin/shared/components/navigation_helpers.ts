import {
  lucideIconMap,
  type LucideIconComponent,
  type LucideIconName,
} from '@/apps/admin/shared/components/lucide_icon_map'
import type { NavCollapsible, NavGroup, NavItem, NavLink } from '@/apps/admin/shared/components/navigation_types'
import { canSeeAdminNavigationUrl } from '@/apps/shared/navigation/can_see'

export function getIconByName(name?: string): LucideIconComponent | undefined {
  if (!name || !(name in lucideIconMap)) return undefined
  return lucideIconMap[name as LucideIconName]
}

export function mapNavItem(item: NavItem & { iconName?: LucideIconName }): NavItem {
  if ('items' in item && item.items) {
    return {
      ...item,
      icon: getIconByName(item.iconName),
      items: item.items.map((subItem) => ({
        ...subItem,
        icon: getIconByName(subItem.iconName),
      })),
    }
  }

  return {
    ...item,
    icon: getIconByName(item.iconName),
  }
}

export function mapNavGroup(group: NavGroup): NavGroup {
  return {
    title: group.title,
    titleKey: group.titleKey,
    items: group.items.map((item) => mapNavItem(item)),
  }
}

export function isNavLink(item: NavItem): item is NavLink {
  return 'url' in item && typeof item.url === 'string'
}

export function isNavCollapsible(item: NavItem): item is NavCollapsible {
  return 'items' in item && Array.isArray(item.items) && item.items.length > 0
}

export function isNavUrlActive(currentUrl: string, targetUrl: string): boolean {
  const [currentPath, currentQuery = ''] = currentUrl.split('?')
  const [targetPath, targetQuery = ''] = targetUrl.split('?')

  if (targetQuery) {
    return currentPath === targetPath && currentQuery === targetQuery
  }

  return currentPath === targetPath
}

export function isNavItemActive(currentUrl: string, item: NavItem): boolean {
  if (isNavLink(item)) {
    return isNavUrlActive(currentUrl, item.url)
  }

  return item.items.some((child) => isNavUrlActive(currentUrl, child.url))
}

export function filterAdminNavigationByRole(
  groups: NavGroup[],
  systemRole: string | null,
  systemPermissions: readonly string[] | null = null
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item): NavItem | null => {
          if (isNavLink(item)) {
            return canSeeAdminNavigationUrl(item.url, { systemRole, systemPermissions })
              ? item
              : null
          }

          const visibleChildren = item.items.filter((child) =>
            canSeeAdminNavigationUrl(child.url, { systemRole, systemPermissions })
          )

          return visibleChildren.length > 0 ? { ...item, items: visibleChildren } : null
        })
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((group) => group.items.length > 0)
}
