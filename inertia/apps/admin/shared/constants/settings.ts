import { FRONTEND_ROUTES } from './routes'

export const SETTINGS_CARDS = [
  {
    title: 'Personal profile',
    description: 'Avatar, bio, and public links.',
    href: FRONTEND_ROUTES.SETTINGS_PROFILE,
  },
  {
    title: 'Account',
    description: 'Authentication details and user account package.',
    href: FRONTEND_ROUTES.SETTINGS_ACCOUNT,
  },
  {
    title: 'Notifications',
    description: 'System notification delivery flows.',
    href: FRONTEND_ROUTES.SETTINGS_NOTIFICATIONS,
  },
] as const
