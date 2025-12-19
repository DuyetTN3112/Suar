import { FRONTEND_ROUTES } from './routes'

export const SETTINGS_CARDS = [
  {
    titleKey: 'settings.account_personal_title',
    titleFallback: 'Account & personal information',
    descriptionKey: 'settings.account_personal_description',
    descriptionFallback: 'Sign-in, account package, bio, and public links.',
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
