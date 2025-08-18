// Authorization module's local view of role string contracts.
// Values match database CHECK constraints; the database owns these values.
export const AuthOrgRole = {
  OWNER: 'org_owner',
  ADMIN: 'org_admin',
  MEMBER: 'org_member',
} as const

export const AuthProjectRole = {
  OWNER: 'project_owner',
  MANAGER: 'project_manager',
  MEMBER: 'project_member',
  VIEWER: 'project_viewer',
} as const

export const AuthSystemRole = {
  SUPERADMIN: 'superadmin',
  SYSTEM_ADMIN: 'system_admin',
  REGISTERED_USER: 'registered_user',
} as const
