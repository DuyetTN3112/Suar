import type { OrganizationCustomRoleDefinition as CustomRoleDefinition } from '#modules/organizations/types/custom_role_definition'

export type SerializedDateTime = string | null

export interface OrganizationRecord extends Record<string, unknown> {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  website: string | null
  plan: string | null
  owner_id: string
  custom_roles: CustomRoleDefinition[] | null
  partner_type: string | null
  partner_verified_at: SerializedDateTime
  partner_verified_by: string | null
  partner_verification_proof: string | null
  partner_expires_at: SerializedDateTime
  partner_is_active: boolean | null
  deleted_at: SerializedDateTime
  created_at: SerializedDateTime
  updated_at: SerializedDateTime
}

export interface OrganizationMembershipRecord extends Record<string, unknown> {
  organization_id: string
  user_id: string
  org_role: string
  status: string
  invited_by: string | null
  created_at?: SerializedDateTime
  updated_at?: SerializedDateTime
}
