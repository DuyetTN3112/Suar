import type { NavGroup } from '@/apps/org/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'

export interface CurrentProjectNavigationContext {
  id: string
  name?: string | null
}

export function buildOrganizationProjectsSection(): NavGroup {
  return {
    title: 'Project portfolio',
    titleKey: 'common.org.projects',
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
        url: FRONTEND_ROUTES.ORG_PROJECTS_CREATE,
        iconName: 'Building',
      },
    ],
  }
}

export const organizationProjectsSection: NavGroup = buildOrganizationProjectsSection()
