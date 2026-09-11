import {
  canSeeOrganizationNavigationUrl,
  canSeeRecruitingNavigation,
} from '@/apps/shared/navigation/can_see'
import {
  lucideIconMap,
  type LucideIconComponent,
  type LucideIconName,
} from '@/apps/user/shared/components/lucide_icon_map'
import type { NavCollapsible, NavGroup, NavItem, NavLink } from '@/apps/user/shared/components/navigation_types'

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

  if (currentPath !== targetPath) {
    return false
  }

  if (targetQuery) {
    const currentParams = new URLSearchParams(currentQuery)
    const targetParams = new URLSearchParams(targetQuery)

    return [...targetParams.entries()].every(([key, value]) => currentParams.get(key) === value)
  }

  return currentQuery === ''
}

export function isNavItemActive(currentUrl: string, item: NavItem): boolean {
  if (isNavLink(item)) {
    return isNavUrlActive(currentUrl, item.url)
  }

  return item.items.some((child) => isNavUrlActive(currentUrl, child.url))
}

export function filterMainNavigationByRole(groups: NavGroup[], role: string | null): NavGroup[] {
  const canRecruit = canSeeRecruitingNavigation({ organizationRole: role })
  const canSeeItem = (item: NavLink): boolean => {
    if (item.url.startsWith('/org')) {
      return canSeeOrganizationNavigationUrl(item.url, { organizationRole: role })
    }

    if (item.url === '/org/talents' || item.url === '/org/bookmarks') {
      return canRecruit
    }

    return true
  }
  const resolveItemForRole = (item: NavLink): NavLink => {
    if (item.url === '/projects' && canRecruit) {
      return {
        ...item,
        url: '/org/projects',
      }
    }

    return item
  }

  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item): NavItem | null => {
          if (isNavLink(item)) {
            return canSeeItem(item) ? resolveItemForRole(item) : null
          }

          const visibleChildren = item.items.filter(canSeeItem)
          if (visibleChildren.length === 0) {
            return null
          }

          return {
            ...item,
            items: visibleChildren.map(resolveItemForRole),
          }
        })
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((group) => group.items.length > 0)
}
