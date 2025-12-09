import type { NavGroup } from '@/apps/org/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'

export const mainOverviewSection: NavGroup = {
  title: 'Overview',
  titleKey: 'common.navigation.overview',
  items: [
    {
      title: 'Capability profile',
      titleKey: 'common.navigation.profile',
      url: FRONTEND_ROUTES.PROFILE,
      iconName: 'UserCircle',
    },
    {
      title: 'Work',
      titleKey: 'common.navigation.work',
      iconName: 'SquareCheckBig',
      items: [
        {
          title: 'Tasks',
          titleKey: 'common.navigation.tasks',
          url: FRONTEND_ROUTES.TASKS,
          iconName: 'SquareCheckBig',
        },
      ],
    },
    {
      title: 'Task marketplace',
      titleKey: 'common.navigation.task_marketplace',
      iconName: 'Store',
      items: [
        {
          title: 'Open tasks',
          titleKey: 'common.navigation.open_tasks',
          url: FRONTEND_ROUTES.MARKETPLACE_TASKS,
          iconName: 'Store',
        },
      ],
    },
  ],
}
