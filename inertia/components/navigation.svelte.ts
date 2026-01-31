import * as LucideIcons from 'lucide-svelte'
import type { ComponentType } from 'svelte'

interface BaseNavItem {
  title: string
  titleKey?: string
  badge?: string
  icon?: ComponentType
}

type NavLink = BaseNavItem & {
  url: string
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: string })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

interface NavGroup {
  title: string
  titleKey?: string
  items: NavItem[]
}

function getIconByName(name?: string): ComponentType | undefined {
  if (!name) return undefined
  return (LucideIcons as unknown as Record<string, ComponentType>)[name]
}

export const defaultOrganizations = [
  {
    id: '1',
    name: 'Suar',
    logo: 'Building',
    plan: 'Pro',
  },
  {
    id: '2',
    name: 'Cá nhân',
    logo: 'User',
    plan: 'Miễn phí',
  },
  {
    id: '3',
    name: 'Nhóm kinh doanh',
    logo: 'Users',
    plan: 'Doanh nghiệp',
  },
]

const navigationData = [
  {
    title: 'Tổng quan',
    titleKey: 'navigation.overview',
    items: [
      {
        title: 'Nhiệm vụ',
        titleKey: 'navigation.tasks',
        url: '/tasks',
        iconName: 'CheckSquare',
      },
      {
        title: 'Tin nhắn',
        titleKey: 'navigation.messages',
        url: '/conversations',
        iconName: 'MessageSquare',
      },
      {
        title: 'Người dùng',
        titleKey: 'navigation.users',
        url: '/users',
        iconName: 'Users',
      },
    ],
  },
  {
    title: 'Tổ chức',
    titleKey: 'navigation.organizations',
    items: [
      {
        title: 'Tổ chức',
        titleKey: 'navigation.organizations',
        url: '/organizations',
        iconName: 'Building',
      },
      {
        title: 'Dự án',
        titleKey: 'navigation.projects',
        url: '/projects',
        iconName: 'Briefcase',
      },
    ],
  },
  {
    title: 'Cài đặt',
    titleKey: 'navigation.settings',
    items: [
      {
        title: 'Cài đặt',
        titleKey: 'navigation.settings',
        url: '/settings',
        iconName: 'Settings',
      },
    ],
  },
]

export const mainNavigation: NavGroup[] = navigationData.map((group) => ({
  title: group.title,
  titleKey: group.titleKey,
  items: group.items.map((item) => ({
    ...item,
    icon: getIconByName(item.iconName),
  })),
}))

export type { NavGroup, NavItem, NavCollapsible, NavLink, BaseNavItem }
