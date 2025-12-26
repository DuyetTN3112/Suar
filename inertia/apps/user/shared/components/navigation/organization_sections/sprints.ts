import type { NavGroup } from '@/apps/user/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'

export const organizationSprintsSection: NavGroup = {
  title: 'Sprint management',
  titleKey: 'common.org.sprints',
  items: [
    {
      title: 'Sprint coordination',
      titleKey: 'common.navigation.sprint_coordination',
      iconName: 'FolderKanban',
      items: [
        {
          title: 'Sprint workspace',
          titleKey: 'common.navigation.sprint_workspace',
          url: FRONTEND_ROUTES.ORG_SPRINTS,
          iconName: 'FolderKanban',
        },
      ],
    },
  ],
}
