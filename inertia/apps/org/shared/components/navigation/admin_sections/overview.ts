import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

export const adminOverviewSection: NavGroup = {
  title: 'Admin overview',
  titleKey: 'common.admin.dashboard',
  items: [
    {
      title: 'Control dashboards',
      titleKey: 'common.navigation.control_dashboards',
      iconName: 'LayoutDashboard',
      items: [
        {
          title: 'Overview dashboard',
          titleKey: 'common.admin.overview',
          url: '/admin',
          iconName: 'LayoutDashboard',
        },
        {
          title: 'Users dashboard',
          titleKey: 'common.navigation.users_dashboard',
          url: '/admin/dashboards/users',
          iconName: 'Users',
        },
        {
          title: 'Operations dashboard',
          titleKey: 'common.navigation.operations_dashboard',
          url: '/admin/dashboards/operations',
          iconName: 'Activity',
        },
      ],
    },
  ],
}
