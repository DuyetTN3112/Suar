import type { OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'

export interface OrganizationMembershipHistoryFact {
  organization_id: string
  organization_name: string
  org_role: string
  joined_at: Date | string
  status: OrganizationUserStatus
}

export interface OrganizationNameFact {
  id: string
  name: string
}
