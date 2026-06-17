/**
 * Organization Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

import type { OrganizationCustomRoleDefinition as CustomRoleDefinition } from '#modules/organizations/public_contracts/access/custom_role_definition'
import type { OrganizationEntity } from '#modules/organizations/domain/directory/entities/organization_entity'

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

  private constructor(props: OrganizationDetailResponseDTOProps) {
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

  static fromProps(props: OrganizationDetailResponseDTOProps): OrganizationDetailResponseDTO {
    return new OrganizationDetailResponseDTO(props)
  }

  static fromEntity(entity: OrganizationEntity): OrganizationDetailResponseDTO {
    return new OrganizationDetailResponseDTO({
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      logo: entity.logo,
      website: entity.website,
      ownerId: entity.ownerId,
      customRoles: entity.customRoles,
      partnerType: entity.partnerType,
      partnerVerifiedAt: entity.partnerVerifiedAt,
      partnerIsActive: entity.partnerIsActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    })
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

  private constructor(props: OrganizationListItemResponseDTOProps) {
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

  static fromProps(props: OrganizationListItemResponseDTOProps): OrganizationListItemResponseDTO {
    return new OrganizationListItemResponseDTO(props)
  }

  static fromEntity(entity: OrganizationEntity): OrganizationListItemResponseDTO {
    return new OrganizationListItemResponseDTO({
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      logo: entity.logo,
      ownerId: entity.ownerId,
      partnerType: entity.partnerType,
      partnerIsActive: entity.partnerIsActive,
      createdAt: entity.createdAt,
    })
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

  private constructor(props: OrganizationSummaryResponseDTOProps) {
    this.id = props.id
    this.name = props.name
    this.slug = props.slug
    this.logo = props.logo
  }

  static fromProps(props: OrganizationSummaryResponseDTOProps): OrganizationSummaryResponseDTO {
    return new OrganizationSummaryResponseDTO(props)
  }

  static fromEntity(entity: OrganizationEntity): OrganizationSummaryResponseDTO {
    return new OrganizationSummaryResponseDTO({
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      logo: entity.logo,
    })
  }
}
