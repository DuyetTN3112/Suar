export const FRONTEND_ROUTES = {
  HOME: '/',
  TASKS: '/tasks',
  TASKS_CREATE: '/tasks/create',
  PROJECTS: '/projects',
  PROJECTS_CREATE: '/projects/create',
  ORGANIZATIONS: '/organizations',
  ORGANIZATIONS_CREATE: '/organizations/create',
  MARKETPLACE_TASKS: '/marketplace/tasks',
  TASK_REVIEW_BOARD: '/reviews/task-board',
  SPRINT_REVERSE_REVIEW_BOARD: '/reviews/sprint-reverse-board',
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
  ORG_SPRINTS: '/org/sprints',
  ORG_TALENTS: '/org/talents',
  ORG_BOOKMARKS: '/org/bookmarks',
  ORG_TASKS_BOARD: '/org/tasks/board',
  ORG_TASKS_LIST: '/org/tasks/list',
  ORG_TASKS_WORKFLOW: '/org/tasks/workflow',
  ORG_MARKETPLACE_TASKS: '/org/marketplace/tasks',
  ORG_TASK_REVIEW_BOARD: '/org/reviews/task-board',
  ORG_SPRINT_REVERSE_REVIEW_BOARD: '/org/reviews/sprint-reverse-board',
  ORG_MANAGER_REVIEW_BOARD: '/org/reviews/sprint-reverse-board?review_type=manager',
  ORG_WORK_ENVIRONMENT_REVIEW_BOARD: '/org/reviews/sprint-reverse-board?review_type=environment',
  ORG_REVERSE_REVIEWS: '/org/reverse-reviews',
  ORG_DISPUTES: '/org/disputes',
  ORG_AUDIT_LOGS: '/org/audit-logs',

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
