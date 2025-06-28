import type { LucideIconComponent } from '@/components/lucide_icon_map'

interface User {
  name: string
  email: string
  avatar: string
}

interface Team {
  name: string
  logo: string
}

export interface BaseNavItem {
  title: string
  titleKey?: string
  badge?: string
  icon?: LucideIconComponent
  iconName?: string
}

export type NavLink = BaseNavItem & {
  url: string
  items?: never
}

export type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: string; titleKey?: string })[]
  url?: string
}

export type NavItem = NavCollapsible | NavLink

export interface NavGroup {
  title: string
  titleKey?: string
  items: NavItem[]
}

interface SidebarData {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}

export type { SidebarData, User, Team }
