import type { NavGroup } from '@/apps/user/shared/components/navigation_types'

export interface ProjectNavigationContext {
  id: string
  name?: string | null
}

function projectPath(projectId: string, suffix = ''): string {
  const base = `/projects/${encodeURIComponent(projectId)}`
  return `${base}${suffix}`
}

export function buildProjectNavigationSections(
  project: ProjectNavigationContext,
  canManageOrganization: boolean
): NavGroup[] {
  const projectOverview = projectPath(project.id)
  const leaveItems: NavGroup['items'] = [
    {
      title: 'All projects',
      titleKey: 'common.org.all_projects',
      url: '/projects',
      iconName: 'Briefcase',
    },
  ]
  if (canManageOrganization) {
    leaveItems.push({
      title: 'Organization management',
      titleKey: 'common.navigation.organization_management',
      url: '/org',
      iconName: 'Building',
    })
  }

  return [
    {
      title: project.name ?? 'Project workspace',
      titleKey: 'common.navigation.current_project',
      items: [
        {
          title: 'Project overview',
          titleKey: 'common.navigation.project_overview',
          url: projectOverview,
          iconName: 'LayoutDashboard',
        },
        {
          title: 'Project members',
          titleKey: 'common.navigation.project_members',
          url: `${projectOverview}?focus=members`,
          iconName: 'Users',
        },
        {
          title: 'Roles & staffing',
          titleKey: 'common.navigation.project_roles_staffing',
          url: `${projectOverview}?focus=roles`,
          iconName: 'UserRoundPlus',
        },
        {
          title: 'Skills',
          titleKey: 'common.navigation.project_skills',
          url: `${projectOverview}?focus=skills`,
          iconName: 'ChartNoAxesColumnIncreasing',
        },
        {
          title: 'Operating model',
          titleKey: 'common.navigation.operating_model',
          url: `${projectOverview}?focus=operating_model`,
          iconName: 'Settings2',
        },
        {
          title: 'Sprints',
          titleKey: 'common.navigation.project_sprints',
          url: `${projectOverview}?focus=sprints`,
          iconName: 'FolderKanban',
        },
      ],
    },
    {
      title: 'Project boards',
      titleKey: 'common.navigation.project_boards',
      items: [
        {
          title: 'Task board',
          titleKey: 'common.navigation.task_board',
          url: projectPath(project.id, '/tasks'),
          iconName: 'SquareCheckBig',
        },
        {
          title: 'Task review',
          titleKey: 'common.navigation.task_review_board',
          url: projectPath(project.id, '/reviews/tasks'),
          iconName: 'ClipboardCheck',
        },
        {
          title: 'Assigner review',
          titleKey: 'common.navigation.manager_review',
          url: projectPath(project.id, '/reviews/assigners'),
          iconName: 'UserCheck',
        },
        {
          title: 'Work environment',
          titleKey: 'common.navigation.work_environment_review',
          url: projectPath(project.id, '/reviews/environment'),
          iconName: 'Building2',
        },
      ],
    },
    {
      title: 'Leave project workspace',
      titleKey: 'common.navigation.leave_project_workspace',
      items: leaveItems,
    },
  ]
}
