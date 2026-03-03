// Projects domain's local view of external role string contracts.
// Values match database CHECK constraints; the database owns these values.
export const ProjectOrgRole = {
  OWNER: 'org_owner',
  ADMIN: 'org_admin',
  MEMBER: 'org_member',
} as const
