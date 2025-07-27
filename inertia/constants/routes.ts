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

  ORG_DEPARTMENTS: '/org/departments',
  ORG_ROLES: '/org/roles',
  ORG_PERMISSIONS: '/org/permissions',
  ORG_MEMBERS: '/org/members',
  ORG_INVITATION_REQUESTS: '/org/invitations/requests',
  ORG_INVITATIONS: '/org/invitations/invitations',
  ORG_SETTINGS: '/org/settings',

  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_ACCOUNT: '/settings/account',
  SETTINGS_APPEARANCE: '/settings/appearance',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_DISPLAY: '/settings/display',
  SETTINGS_ROOT: '/settings',
} as const

export function getTaskDetailRoute(taskId: string): string {
  return `${FRONTEND_ROUTES.TASKS}/${taskId}`
}

export function getTaskApplicationsRoute(taskId: string): string {
  return `${getTaskDetailRoute(taskId)}/applications`
}

export function getTaskApplicationProcessRoute(taskId: string, applicationId: string): string {
  return `${getTaskApplicationsRoute(taskId)}/${applicationId}/process`
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
