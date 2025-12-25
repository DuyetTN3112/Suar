import type { NavGroup } from '@/apps/user/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'

export const mainSettingsSection: NavGroup = {
  title: 'Settings',
  titleKey: 'common.navigation.settings',
  items: [
    {
      title: 'Account & personal information',
      titleKey: 'common.navigation.account',
      url: FRONTEND_ROUTES.SETTINGS_ACCOUNT,
      iconName: 'Shield',
    },
    {
      title: 'Account audit log',
      titleKey: 'common.navigation.account_audit_log',
      url: FRONTEND_ROUTES.SETTINGS_AUDIT_LOGS,
      iconName: 'FileText',
    },
  ],
}
