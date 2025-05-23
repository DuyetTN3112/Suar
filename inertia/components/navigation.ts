import { LucideIcon } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

interface BaseNavItem {
  title: string
  titleKey?: string // Khóa dịch cho tiêu đề
  badge?: string
  icon?: React.ElementType
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
  titleKey?: string // Khóa dịch cho tiêu đề nhóm
  items: NavItem[]
}

// Hàm để chuyển đổi chuỗi icon thành component icon tương ứng
function getIconByName(name?: string): React.ElementType | undefined {
  if (!name) return undefined
  return (LucideIcons as any)[name]
}

// Các tổ chức mẫu cho giao diện
export const defaultOrganizations = [
  {
    id: '1',
    name: 'ShadcnAdmin',
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

// Các định nghĩa cho menu điều hướng chính
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

// Chuyển đổi dữ liệu để có icon là component thay vì string
export const mainNavigation: NavGroup[] = navigationData.map((group) => ({
  title: group.title,
  titleKey: group.titleKey,
  items: group.items.map((item) => ({
    ...item,
    icon: getIconByName(item.iconName as string),
  })),
}))

export type { NavGroup, NavItem, NavCollapsible, NavLink, BaseNavItem }
