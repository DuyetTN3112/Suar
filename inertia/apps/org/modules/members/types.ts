export interface OrganizationMemberIdentity {
  id: string
  username: string
  email: string
  status: string
  created_at?: string
  organization_users?: Array<{
    organization_id: string
    org_role: string
  }>
}

export type OrganizationMemberCandidate = Pick<
  OrganizationMemberIdentity,
  'id' | 'username' | 'email' | 'status'
>
