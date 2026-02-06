// Projects domain's local view of external role string contracts.
// Values match database CHECK constraints; the database owns these values.
export const ProjectOrgRole = {
  OWNER: 'org_owner',
  ADMIN: 'org_admin',
  MEMBER: 'org_member',
} as const

export const ProjectSystemRole = {
  SUPERADMIN: 'superadmin',
  SYSTEM_ADMIN: 'system_admin',
  REGISTERED_USER: 'registered_user',
} as const
