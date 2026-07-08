import type { NavGroup } from '@/apps/user/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'

export const organizationProjectsSection: NavGroup = {
  title: 'Project management',
  titleKey: 'common.org.projects',
  items: [
    {
      title: 'Project portfolio',
      titleKey: 'common.navigation.project_portfolio',
      iconName: 'Briefcase',
      items: [
        {
          title: 'Project portfolio',
          titleKey: 'common.org.all_projects',
          url: FRONTEND_ROUTES.ORG_PROJECTS,
          iconName: 'Briefcase',
        },
        {
          title: 'Create project',
          titleKey: 'common.navigation.create_project',
          url: FRONTEND_ROUTES.PROJECTS_CREATE,
          iconName: 'Building',
        },
      ],
    },
  ],
}
