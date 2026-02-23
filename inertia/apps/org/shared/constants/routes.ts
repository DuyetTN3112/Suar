export const FRONTEND_ROUTES = {
  HOME: '/',
  TASKS: '/tasks',
  TASKS_CREATE: '/tasks/create',
  PROJECTS: '/projects',
  PROJECTS_CREATE: '/projects/create',
  ORGANIZATIONS: '/organizations',
  ORGANIZATIONS_CREATE: '/organizations/create',
  MARKETPLACE_TASKS: '/marketplace/tasks',
  MY_APPLICATIONS: '/my-applications',
  PROFILE: '/profile',
  LOGOUT: '/logout',

  SWITCH_ORGANIZATION: '/switch-organization',
  SWITCH_PROJECT: '/switch-project',

  ORG_HOME: '/org',
  ORG_DEPARTMENTS: '/org/departments',
  ORG_ROLES: '/org/roles',
  ORG_PERMISSIONS: '/org/permissions',
  ORG_MEMBERS: '/org/members',
  ORG_INVITATION_REQUESTS: '/org/invitations/requests',
  ORG_INVITATIONS: '/org/invitations',
  ORG_SETTINGS: '/org/settings',
  ORG_PROJECTS: '/org/projects',
  ORG_TALENTS: '/org/talents',
  ORG_BOOKMARKS: '/org/bookmarks',
  ORG_MARKETPLACE_TASKS: '/org/marketplace/tasks',
  ORG_APPLICATIONS: '/org/applications',
  ORG_AUDIT_LOGS: '/org/audit-logs',
  ORG_SPRINTS: '/org/sprints',
  ORG_PROJECTS_CREATE: '/org/projects/create',

  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_ACCOUNT: '/settings/account',
  SETTINGS_AUDIT_LOGS: '/settings/audit-logs',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_ROOT: '/settings',
} as const

export function getTaskDetailRoute(taskId: string): string {
  return `${FRONTEND_ROUTES.TASKS}/${taskId}`
}

export function getTaskApplicationsRoute(taskId: string): string {
  return `${getTaskDetailRoute(taskId)}/applications`
}

export function getTaskApplyRoute(taskId: string): string {
  return `/api/v1/tasks/${taskId}/apply`
}

export function getTaskApplicationProcessRoute(applicationId: string): string {
  return `/applications/${applicationId}/process`
}

export function getProjectDetailRoute(projectId: string): string {
  return `${FRONTEND_ROUTES.PROJECTS}/${projectId}`
}

export function getApplicationWithdrawRoute(applicationId: string): string {
  return `/applications/${applicationId}/withdraw`
}

export function getOrgMemberRoleRoute(memberId: string): string {
  return `${FRONTEND_ROUTES.ORG_MEMBERS}/${memberId}/role`
}
