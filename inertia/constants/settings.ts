import { FRONTEND_ROUTES } from './routes'

export const SETTINGS_CARDS = [
  {
    title: 'Hồ sơ cá nhân',
    description: 'Avatar, bio và các liên kết công khai.',
    href: FRONTEND_ROUTES.SETTINGS_PROFILE,
  },
  {
    title: 'Tài khoản',
    description: 'Thông tin xác thực và package của user account.',
    href: FRONTEND_ROUTES.SETTINGS_ACCOUNT,
  },
  {
    title: 'Giao diện',
    description: 'Theme sáng tối và bộ font chuẩn của dashboard.',
    href: FRONTEND_ROUTES.SETTINGS_APPEARANCE,
  },
  {
    title: 'Thông báo',
    description: 'Các luồng nhận thông báo từ hệ thống.',
    href: FRONTEND_ROUTES.SETTINGS_NOTIFICATIONS,
  },
  {
    title: 'Hiển thị',
    description: 'Density, layout và chuyển động của UI.',
    href: FRONTEND_ROUTES.SETTINGS_DISPLAY,
  },
] as const
