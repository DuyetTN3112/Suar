import { LucideIcon } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

interface BaseNavItem {
  title: string
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
    items: [
      {
        title: 'Nhiệm vụ',
        url: '/tasks',
        iconName: 'CheckSquare',
      },
      {
        title: 'Tin nhắn',
        url: '/conversations',
        iconName: 'MessageSquare',
      },
      {
        title: 'Người dùng',
        url: '/users',
        iconName: 'Users',
      },
    ],
  },
  {
    title: 'Tổ chức',
    items: [
      {
        title: 'Tổ chức của bạn',
        url: '/organizations',
        iconName: 'Building',
      },
      {
        title: 'Tạo tổ chức mới',
        url: '/organizations/create',
        iconName: 'Plus',
      },
    ],
  },
  {
    title: 'Ứng dụng',
    items: [
      {
        title: 'Tất cả ứng dụng',
        url: '/apps',
        iconName: 'AppWindow',
      },
      {
        title: 'Danh mục',
        url: '/app_categories',
        iconName: 'FolderTree',
      },
    ],
  },
  {
    title: 'Cài đặt',
    items: [
      {
        title: 'Cài đặt',
        url: '/settings',
        iconName: 'Settings',
      },
    ],
  },
]

// Chuyển đổi dữ liệu để có icon là component thay vì string
export const mainNavigation: NavGroup[] = navigationData.map((group) => ({
  title: group.title,
  items: group.items.map((item) => ({
    ...item,
    icon: getIconByName(item.iconName as string),
  })),
}))

export type { NavGroup, NavItem, NavCollapsible, NavLink, BaseNavItem }
