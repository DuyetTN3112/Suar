<script lang="ts" module>
  import type { ComponentType } from 'svelte'

  interface User {
    name: string
    email: string
    avatar: string
  }

  interface Team {
    name: string
    logo: ComponentType
    plan: string
  }

  interface BaseNavItem {
    title: string
    titleKey?: string
    badge?: string
    icon?: ComponentType
    iconName?: string
  }

  type NavLink = BaseNavItem & {
    url: string
    items?: never
  }

  type NavCollapsible = BaseNavItem & {
    items: (BaseNavItem & { url: string; titleKey?: string })[]
    url?: string
  }

  type NavItem = NavCollapsible | NavLink

  interface NavGroup {
    title: string
    titleKey?: string
    items: NavItem[]
  }

  interface SidebarData {
    user: User
    teams: Team[]
    navGroups: NavGroup[]
  }

  export type { SidebarData, User, Team, NavGroup, NavItem, NavCollapsible, NavLink, BaseNavItem }
</script>
