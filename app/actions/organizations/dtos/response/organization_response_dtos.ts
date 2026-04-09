/**
 * Organization Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

import type { CustomRoleDefinition } from '#types/database'

export interface OrganizationDetailResponseDTOProps {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  website: string | null
  ownerId: string
  customRoles: CustomRoleDefinition[] | null
  partnerType: string | null
  partnerVerifiedAt: Date | null
  partnerIsActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationListItemResponseDTOProps {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  ownerId: string
  partnerType: string | null
  partnerIsActive: boolean
  createdAt: Date
}

export interface OrganizationSummaryResponseDTOProps {
  id: string
  name: string
  slug: string
  logo: string | null
}

export interface OrganizationMemberResponseDTOProps {
  id: string
  user_id: string
  username: string
  email: string
  org_role: string
  role_name: string
  status: string
  joined_at: string
  last_activity_at?: string | null
}

/**
 * OrganizationDetailResponseDTO — Full organization detail for detail views
 */
export class OrganizationDetailResponseDTO {
  public readonly id: string
  public readonly name: string
  public readonly slug: string
  public readonly description: string | null
  public readonly logo: string | null
  public readonly website: string | null
  public readonly ownerId: string
  public readonly customRoles: CustomRoleDefinition[] | null
  public readonly partnerType: string | null
  public readonly partnerVerifiedAt: Date | null
  public readonly partnerIsActive: boolean
  public readonly createdAt: Date
  public readonly updatedAt: Date

  constructor(props: OrganizationDetailResponseDTOProps) {
    this.id = props.id
    this.name = props.name
    this.slug = props.slug
    this.description = props.description
    this.logo = props.logo
    this.website = props.website
    this.ownerId = props.ownerId
    this.customRoles = props.customRoles
    this.partnerType = props.partnerType
    this.partnerVerifiedAt = props.partnerVerifiedAt
    this.partnerIsActive = props.partnerIsActive
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }
}

/**
 * OrganizationListItemResponseDTO — Compact organization info for list views
 */
export class OrganizationListItemResponseDTO {
  public readonly id: string
  public readonly name: string
  public readonly slug: string
  public readonly description: string | null
  public readonly logo: string | null
  public readonly ownerId: string
  public readonly partnerType: string | null
  public readonly partnerIsActive: boolean
  public readonly createdAt: Date

  constructor(props: OrganizationListItemResponseDTOProps) {
    this.id = props.id
    this.name = props.name
    this.slug = props.slug
    this.description = props.description
    this.logo = props.logo
    this.ownerId = props.ownerId
    this.partnerType = props.partnerType
    this.partnerIsActive = props.partnerIsActive
    this.createdAt = props.createdAt
  }
}

/**
 * OrganizationSummaryResponseDTO — Minimal organization info (for references in other entities)
 */
export class OrganizationSummaryResponseDTO {
  public readonly id: string
  public readonly name: string
  public readonly slug: string
  public readonly logo: string | null

  constructor(props: OrganizationSummaryResponseDTOProps) {
    this.id = props.id
    this.name = props.name
    this.slug = props.slug
    this.logo = props.logo
  }
}

/**
 * OrganizationMemberResponseDTO — canonical member response for members management views
 */
export class OrganizationMemberResponseDTO {
  public readonly id: string
  public readonly user_id: string
  public readonly username: string
  public readonly email: string
  public readonly org_role: string
  public readonly role_name: string
  public readonly status: string
  public readonly joined_at: string
  public readonly last_activity_at?: string | null

  constructor(props: OrganizationMemberResponseDTOProps) {
    this.id = props.id
    this.user_id = props.user_id
    this.username = props.username
    this.email = props.email
    this.org_role = props.org_role
    this.role_name = props.role_name
    this.status = props.status
    this.joined_at = props.joined_at
    this.last_activity_at = props.last_activity_at
  }
}
