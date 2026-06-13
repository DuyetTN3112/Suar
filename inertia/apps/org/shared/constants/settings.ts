import { FRONTEND_ROUTES } from './routes'

export const SETTINGS_CARDS = [
  {
    titleKey: 'settings.profile_title',
    titleFallback: 'Personal profile',
    descriptionKey: 'settings.profile_card_description',
    descriptionFallback: 'Avatar, bio, and public links.',
    href: FRONTEND_ROUTES.SETTINGS_PROFILE,
  },
  {
    titleKey: 'settings.account_title',
    titleFallback: 'Account',
    descriptionKey: 'settings.account_card_description',
    descriptionFallback: 'Authentication details and user account package.',
    href: FRONTEND_ROUTES.SETTINGS_ACCOUNT,
  },
  {
    titleKey: 'settings.notifications_title',
    titleFallback: 'Notifications',
    descriptionKey: 'settings.notifications_card_description',
    descriptionFallback: 'System notification delivery flows.',
    href: FRONTEND_ROUTES.SETTINGS_NOTIFICATIONS,
  },
] as const
