import type { NavGroup } from '@/apps/user/shared/components/navigation_types'

export const adminUsersSection: NavGroup = {
  title: 'Users',
  titleKey: 'common.admin.user_management',
  items: [
    {
      title: 'User admin',
      titleKey: 'common.navigation.user_admin',
      iconName: 'Users',
      items: [
        {
          title: 'All users',
          titleKey: 'common.admin.users',
          url: '/admin/users',
          iconName: 'Users',
        },
      ],
    },
  ],
}
