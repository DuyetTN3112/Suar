import type { NavGroup } from '@/apps/org/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'

export const mainSettingsSection: NavGroup = {
  title: 'Settings',
  titleKey: 'common.navigation.settings',
  items: [
    {
      title: 'Profile',
      titleKey: 'common.navigation.profile',
      url: '/profile',
      iconName: 'UserCircle',
    },
    {
      title: 'Setup',
      titleKey: 'common.navigation.setup',
      iconName: 'Settings2',
      items: [
        {
          title: 'Personal profile',
          titleKey: 'common.navigation.personal_profile',
          url: FRONTEND_ROUTES.SETTINGS_PROFILE,
        },
        {
          title: 'Account',
          titleKey: 'common.navigation.account',
          url: FRONTEND_ROUTES.SETTINGS_ACCOUNT,
        },
        {
          title: 'Account audit log',
          titleKey: 'common.navigation.account_audit_log',
          url: FRONTEND_ROUTES.SETTINGS_AUDIT_LOGS,
          iconName: 'FileText',
        },
      ],
    },
  ],
}
