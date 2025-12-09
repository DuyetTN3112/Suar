import type { LucideIconComponent, LucideIconName } from '@/apps/org/shared/components/lucide_icon_map'

export interface BaseNavItem {
  title: string
  titleKey?: string
  titleParams?: Record<string, string | number | boolean>
  badge?: string
  icon?: LucideIconComponent
  iconName?: LucideIconName
}

export type NavLink = BaseNavItem & {
  url: string
  items?: never
}

export type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: string })[]
  url?: never
}

export type NavItem = NavCollapsible | NavLink

export interface NavGroup {
  title: string
  titleKey?: string
  items: NavItem[]
}
