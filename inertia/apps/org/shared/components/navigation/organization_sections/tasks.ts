import type { NavGroup } from '@/apps/org/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'

export const organizationTasksSection: NavGroup = {
  title: 'Task management',
  titleKey: 'common.org.tasks',
  items: [
    {
      title: 'Task coordination',
      titleKey: 'common.navigation.task_coordination',
      iconName: 'SquareCheckBig',
      items: [
        {
          title: 'Board task',
          titleKey: 'common.navigation.task_board',
          url: FRONTEND_ROUTES.ORG_TASKS_BOARD,
          iconName: 'SquareCheckBig',
        },
        {
          title: 'Task list',
          titleKey: 'common.navigation.task_list',
          url: FRONTEND_ROUTES.ORG_TASKS_LIST,
          iconName: 'FolderKanban',
        },
        {
          title: 'Workflow task',
          titleKey: 'common.org.workflow',
          url: FRONTEND_ROUTES.ORG_TASKS_WORKFLOW,
          iconName: 'GitBranch',
        },
      ],
    },
    {
      title: 'Open task source',
      titleKey: 'common.navigation.open_task_source',
      iconName: 'Store',
      items: [
        {
          title: 'Task marketplace',
          titleKey: 'common.navigation.task_marketplace',
          url: FRONTEND_ROUTES.ORG_MARKETPLACE_TASKS,
          iconName: 'Store',
        },
      ],
    },
    {
      title: 'Review task',
      titleKey: 'common.navigation.task_review',
      iconName: 'Star',
      items: [
        {
          title: 'Task review board',
          titleKey: 'common.navigation.task_review_board',
          url: FRONTEND_ROUTES.ORG_TASK_REVIEW_BOARD,
          iconName: 'FolderKanban',
        },
      ],
    },
  ],
}
