import type { NavGroup } from '@/apps/org/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'

import type { CurrentProjectNavigationContext } from './projects'

export function buildOrganizationSprintsSection(
  _currentProject?: CurrentProjectNavigationContext | null
): NavGroup {
  const items: NavGroup['items'] = [
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
  ]

  return {
    title: 'Sprint management',
    titleKey: 'common.org.sprints',
    items,
  }
}

export const organizationSprintsSection: NavGroup = buildOrganizationSprintsSection()
