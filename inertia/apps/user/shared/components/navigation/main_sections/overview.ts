import type { NavGroup } from '@/apps/user/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'

export const mainOverviewSection: NavGroup = {
  title: 'Overview',
  titleKey: 'common.navigation.overview',
  items: [
    {
      title: 'Personal overview',
      titleKey: 'common.navigation.personal_overview',
      url: '/dashboard',
      iconName: 'LayoutDashboard',
    },
    {
      title: 'Capability profile',
      titleKey: 'common.navigation.profile',
      url: FRONTEND_ROUTES.PROFILE,
      iconName: 'UserCircle',
    },
    {
      title: 'Task board',
      titleKey: 'common.navigation.tasks',
      url: FRONTEND_ROUTES.TASKS,
      iconName: 'SquareCheckBig',
    },
    {
      title: 'Open tasks',
      titleKey: 'common.navigation.open_tasks',
      url: FRONTEND_ROUTES.MARKETPLACE_TASKS,
      iconName: 'Store',
    },
    {
      title: 'My applications',
      titleKey: 'common.navigation.my_applications',
      url: FRONTEND_ROUTES.MY_APPLICATIONS,
      iconName: 'Send',
    },
  ],
}
