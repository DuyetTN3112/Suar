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
        title: 'Tasks',
        titleKey: 'navigation.tasks',
        url: '/tasks',
        iconName: 'CheckSquare',
      },
      {
        title: 'Marketplace',
        titleKey: 'navigation.marketplace',
        url: '/marketplace/tasks',
        iconName: 'Store',
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
    title: 'Ứng tuyển',
    titleKey: 'navigation.applications',
    items: [
      {
        title: 'Review',
        titleKey: 'navigation.reviews',
        url: '/my-reviews',
        iconName: 'ClipboardCheck',
      },
      {
        title: 'Đơn của tôi',
        titleKey: 'navigation.my_applications',
        url: '/my-applications',
        iconName: 'FileText',
      },
    ],
  },
  {
    title: 'Cài đặt',
    titleKey: 'navigation.settings',
    items: [
      {
        title: 'Hồ sơ',
        titleKey: 'navigation.profile',
        url: '/profile',
        iconName: 'UserCircle',
      },
      {
        title: 'Tài khoản',
        titleKey: 'navigation.account',
        url: '/settings/account',
        iconName: 'User',
      },
      {
        title: 'Giao diện',
        titleKey: 'navigation.appearance',
        url: '/settings/appearance',
        iconName: 'Palette',
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

// System Admin Navigation
const adminNavigationData = [
  {
    title: 'Dashboard',
    titleKey: 'admin.dashboard',
    items: [
      {
        title: 'Overview',
        titleKey: 'admin.overview',
        url: '/admin',
        iconName: 'LayoutDashboard',
      },
    ],
  },
  {
    title: 'User Management',
    titleKey: 'admin.user_management',
    items: [
      {
        title: 'All Users',
        titleKey: 'admin.users',
        url: '/admin/users',
        iconName: 'Users',
      },
      {
        title: 'System Roles',
        titleKey: 'admin.system_roles',
        url: '/admin/users/roles',
        iconName: 'Shield',
      },
    ],
  },
  {
    title: 'Organizations',
    titleKey: 'admin.organizations',
    items: [
      {
        title: 'All Organizations',
        titleKey: 'admin.all_organizations',
        url: '/admin/organizations',
        iconName: 'Building2',
      },
      {
        title: 'Plans & Billing',
        titleKey: 'admin.plans',
        url: '/admin/organizations/plans',
        iconName: 'CreditCard',
      },
    ],
  },
  {
    title: 'System',
    titleKey: 'admin.system',
    items: [
      {
        title: 'Audit Logs',
        titleKey: 'admin.audit_logs',
        url: '/admin/audit-logs',
        iconName: 'FileText',
      },
      {
        title: 'Flagged Reviews',
        titleKey: 'admin.reviews',
        url: '/admin/reviews',
        iconName: 'Flag',
      },
    ],
  },
]

export const adminNavigation: NavGroup[] = adminNavigationData.map((group) => ({
  title: group.title,
  titleKey: group.titleKey,
  items: group.items.map((item) => ({
    ...item,
    icon: getIconByName(item.iconName),
  })),
}))

// Organization Admin Navigation
const organizationNavigationData = [
  {
    title: 'Dashboard',
    titleKey: 'org.dashboard',
    items: [
      {
        title: 'Overview',
        titleKey: 'org.overview',
        url: '/org',
        iconName: 'LayoutDashboard',
      },
    ],
  },
  {
    title: 'Team',
    titleKey: 'org.team',
    items: [
      {
        title: 'Members',
        titleKey: 'org.members',
        url: '/org/members',
        iconName: 'Users',
      },
      {
        title: 'Invitations',
        titleKey: 'org.invitations',
        url: '/org/invitations',
        iconName: 'Mail',
      },
      {
        title: 'Roles & Permissions',
        titleKey: 'org.roles',
        url: '/org/members/roles',
        iconName: 'Shield',
      },
    ],
  },
  {
    title: 'Projects',
    titleKey: 'org.projects',
    items: [
      {
        title: 'All Projects',
        titleKey: 'org.all_projects',
        url: '/org/projects',
        iconName: 'Briefcase',
      },
      {
        title: 'Workflow',
        titleKey: 'org.workflow',
        url: '/org/workflow',
        iconName: 'GitBranch',
      },
    ],
  },
  {
    title: 'Settings',
    titleKey: 'org.settings',
    items: [
      {
        title: 'Organization',
        titleKey: 'org.organization_settings',
        url: '/org/settings',
        iconName: 'Settings',
      },
      {
        title: 'Billing',
        titleKey: 'org.billing',
        url: '/org/billing',
        iconName: 'CreditCard',
      },
    ],
  },
]

export const organizationNavigation: NavGroup[] = organizationNavigationData.map((group) => ({
  title: group.title,
  titleKey: group.titleKey,
  items: group.items.map((item) => ({
    ...item,
    icon: getIconByName(item.iconName),
  })),
}))

export type { NavGroup, NavItem, NavCollapsible, NavLink, BaseNavItem }
