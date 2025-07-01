import {
  lucideIconMap,
  type LucideIconComponent,
  type LucideIconName,
} from '@/components/lucide_icon_map'
import { FRONTEND_ROUTES } from '@/constants'

interface BaseNavItem {
  title: string
  titleKey?: string
  badge?: string
  icon?: LucideIconComponent
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

function getIconByName(name?: string): LucideIconComponent | undefined {
  if (!name || !(name in lucideIconMap)) return undefined
  return lucideIconMap[name as LucideIconName]
}

const navigationData = [
  {
    title: 'Tổng quan',
    titleKey: 'navigation.overview',
    items: [
      {
        title: 'Tasks',
        titleKey: 'navigation.tasks',
        url: FRONTEND_ROUTES.TASKS,
        iconName: 'SquareCheckBig',
      },
      {
        title: 'Marketplace',
        titleKey: 'navigation.marketplace',
        url: '/marketplace/tasks',
        iconName: 'Store',
      },
      // NOTE: "Người dùng" menu removed - now only accessible via /admin/users for system admins
      // This fixes ISSUES.md P0 - normal users should not see user management
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
    title: 'Đánh Giá',
    titleKey: 'navigation.reviews_and_applications',
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
        title: 'Thiết lập',
        iconName: 'Settings2',
        items: [
          {
            title: 'Hồ sơ cá nhân',
            url: FRONTEND_ROUTES.SETTINGS_PROFILE,
          },
          {
            title: 'Tài khoản',
            titleKey: 'navigation.account',
            url: FRONTEND_ROUTES.SETTINGS_ACCOUNT,
          },
          {
            title: 'Giao diện',
            titleKey: 'navigation.appearance',
            url: FRONTEND_ROUTES.SETTINGS_APPEARANCE,
          },
          {
            title: 'Thông báo',
            url: FRONTEND_ROUTES.SETTINGS_NOTIFICATIONS,
          },
          {
            title: 'Hiển thị',
            url: FRONTEND_ROUTES.SETTINGS_DISPLAY,
          },
        ],
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
    title: 'Tổng Quan',
    titleKey: 'admin.dashboard',
    items: [
      {
        title: 'Dashboard tổng',
        titleKey: 'admin.overview',
        url: '/admin',
        iconName: 'LayoutDashboard',
      },
      {
        title: 'Dashboard người dùng',
        url: '/admin/dashboards/users',
        iconName: 'Users',
      },
      {
        title: 'Dashboard vận hành',
        url: '/admin/dashboards/operations',
        iconName: 'Activity',
      },
      {
        title: 'Dashboard gói đăng ký',
        url: '/admin/dashboards/subscriptions',
        iconName: 'ChartNoAxesColumnIncreasing',
      },
    ],
  },
  {
    title: 'Người Dùng',
    titleKey: 'admin.user_management',
    items: [
      {
        title: 'Tất cả người dùng',
        titleKey: 'admin.users',
        url: '/admin/users',
        iconName: 'Users',
      },
    ],
  },
  {
    title: 'Tổ Chức',
    titleKey: 'admin.organizations',
    items: [
      {
        title: 'Tất cả tổ chức',
        titleKey: 'admin.all_organizations',
        url: '/admin/organizations',
        iconName: 'Building2',
      },
    ],
  },
  {
    title: 'Hệ Thống',
    titleKey: 'admin.system',
    items: [
      {
        title: 'Vai trò và quyền',
        url: '/admin/permissions',
        iconName: 'ShieldCheck',
      },
      {
        title: 'Audit Logs',
        titleKey: 'admin.audit_logs',
        url: '/admin/audit-logs',
        iconName: 'FileText',
      },
      {
        title: 'Review bị gắn cờ',
        titleKey: 'admin.reviews',
        url: '/admin/reviews',
        iconName: 'Flag',
      },
      {
        title: 'Gói dịch vụ',
        titleKey: 'admin.packages',
        url: '/admin/packages',
        iconName: 'Package2',
      },
      {
        title: 'QR gói cá nhân',
        url: '/admin/qr-codes',
        iconName: 'QrCode',
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
    title: 'Tổng Quan',
    titleKey: 'org.dashboard',
    items: [
      {
        title: 'Dashboard',
        titleKey: 'org.overview',
        url: '/org',
        iconName: 'LayoutDashboard',
      },
    ],
  },
  {
    title: 'Tổ Chức',
    titleKey: 'org.team',
    items: [
      {
        title: 'Phòng ban',
        url: FRONTEND_ROUTES.ORG_DEPARTMENTS,
        iconName: 'Building2',
      },
      {
        title: 'Vai trò',
        url: FRONTEND_ROUTES.ORG_ROLES,
        iconName: 'Shield',
      },
      {
        title: 'Quyền hạn',
        url: FRONTEND_ROUTES.ORG_PERMISSIONS,
        iconName: 'ShieldCheck',
      },
      {
        title: 'Thành viên',
        titleKey: 'org.members',
        url: FRONTEND_ROUTES.ORG_MEMBERS,
        iconName: 'Users',
      },
      {
        title: 'Lời mời',
        titleKey: 'org.invitations',
        url: FRONTEND_ROUTES.ORG_INVITATIONS,
        iconName: 'Mail',
      },
      {
        title: 'Yêu cầu tham gia',
        titleKey: 'org.requests',
        url: FRONTEND_ROUTES.ORG_INVITATION_REQUESTS,
        iconName: 'UserRoundPlus',
      },
    ],
  },
  {
    title: 'Công Việc',
    titleKey: 'org.projects',
    items: [
      {
        title: 'Danh sách task',
        url: '/org/tasks',
        iconName: 'SquareCheckBig',
      },
      {
        title: 'Dự án',
        titleKey: 'org.all_projects',
        url: '/org/projects',
        iconName: 'Briefcase',
      },
      {
        title: 'Workflow',
        titleKey: 'org.workflow',
        url: '/org/workflow/statuses',
        iconName: 'GitBranch',
      },
    ],
  },
  {
    title: 'Cài Đặt',
    titleKey: 'org.settings',
    items: [
      {
        title: 'Thông tin tổ chức',
        titleKey: 'org.organization_settings',
        url: FRONTEND_ROUTES.ORG_SETTINGS,
        iconName: 'Settings',
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
