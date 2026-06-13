import type { NavGroup } from '@/apps/org/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'

export interface CurrentProjectNavigationContext {
  id: string
  name?: string | null
}

function projectDetailUrl(
  projectId: string,
  focus?: 'details' | 'members' | 'skills' | 'roles' | 'operating_model' | 'sprints'
) {
  const baseUrl = `${FRONTEND_ROUTES.ORG_PROJECTS}/${encodeURIComponent(projectId)}`
  return focus ? `${baseUrl}?focus=${focus}` : baseUrl
}

export function buildOrganizationProjectsSection(
  currentProject?: CurrentProjectNavigationContext | null
): NavGroup {
  const items: NavGroup['items'] = [
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
          url: FRONTEND_ROUTES.ORG_PROJECTS_CREATE,
          iconName: 'Building',
        },
      ],
    },
  ]

  if (currentProject?.id) {
    items.push({
      title: currentProject.name ? `Current project: ${currentProject.name}` : 'Current project',
      titleKey: currentProject.name ? 'common.navigation.current_project_with_name' : 'common.navigation.current_project',
      ...(currentProject.name ? { titleParams: { name: currentProject.name } } : {}),
      iconName: 'FolderKanban',
      items: [
        {
          title: 'Project overview',
          titleKey: 'common.navigation.project_overview',
          url: projectDetailUrl(currentProject.id, 'details'),
          iconName: 'LayoutDashboard',
        },
        {
          title: 'Project members',
          titleKey: 'common.navigation.project_members',
          url: projectDetailUrl(currentProject.id, 'members'),
          iconName: 'Users',
        },
        {
          title: 'Skills project',
          titleKey: 'common.navigation.project_skills',
          url: projectDetailUrl(currentProject.id, 'skills'),
          iconName: 'ChartNoAxesColumnIncreasing',
        },
        {
          title: 'Project roles & staffing',
          titleKey: 'common.navigation.project_roles_staffing',
          url: projectDetailUrl(currentProject.id, 'roles'),
          iconName: 'UserRoundPlus',
        },
        {
          title: 'Operating model',
          titleKey: 'common.navigation.operating_model',
          url: projectDetailUrl(currentProject.id, 'operating_model'),
          iconName: 'Settings2',
        },
        {
          title: 'Project sprints',
          titleKey: 'common.navigation.project_sprints',
          url: projectDetailUrl(currentProject.id, 'sprints'),
          iconName: 'FolderKanban',
        },
      ],
    })

    items.push({
      title: 'Review sau sprint',
      titleKey: 'common.navigation.sprint_reviews',
      iconName: 'ClipboardCheck',
      items: [
        {
          title: 'Manager review',
          titleKey: 'common.navigation.manager_review',
          url: FRONTEND_ROUTES.ORG_MANAGER_REVIEW_BOARD,
          iconName: 'ClipboardCheck',
        },
        {
          title: 'Work environment review',
          titleKey: 'common.navigation.work_environment_review',
          url: FRONTEND_ROUTES.ORG_WORK_ENVIRONMENT_REVIEW_BOARD,
          iconName: 'ClipboardCheck',
        },
      ],
    })
  }

  return {
    title: 'Project management',
    titleKey: 'common.org.projects',
    items,
  }
}

export const organizationProjectsSection: NavGroup = buildOrganizationProjectsSection()
