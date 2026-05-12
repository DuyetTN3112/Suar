import type { CustomRoleDefinition, DatabaseId } from '#types/database'

export type SerializedDateTime = string | null

export interface OrganizationRecord extends Record<string, unknown> {
  id: DatabaseId
  name: string
  slug: string
  description: string | null
  logo: string | null
  website: string | null
  plan: string | null
  owner_id: DatabaseId
  custom_roles: CustomRoleDefinition[] | null
  partner_type: string | null
  partner_verified_at: SerializedDateTime
  partner_verified_by: DatabaseId | null
  partner_verification_proof: string | null
  partner_expires_at: SerializedDateTime
  partner_is_active: boolean | null
  deleted_at: SerializedDateTime
  created_at: SerializedDateTime
  updated_at: SerializedDateTime
}

export interface OrganizationMembershipRecord extends Record<string, unknown> {
  organization_id: DatabaseId
  user_id: DatabaseId
  org_role: string
  status: string
  invited_by: DatabaseId | null
  created_at?: SerializedDateTime
  updated_at?: SerializedDateTime
}
