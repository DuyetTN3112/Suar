/**
 * OrganizationEntity — Pure Domain Entity
 *
 * Represents an Organization in the business domain.
 * 100% pure TypeScript, NO framework dependencies.
 * All business logic related to organization state lives here.
 */

export interface CustomRoleDefinition {
  name: string
  permissions: string[]
  description?: string
}

export interface OrganizationEntityProps {
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
  partnerVerifiedBy: string | null
  partnerVerificationProof: string | null
  partnerExpiresAt: Date | null
  partnerIsActive: boolean
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class OrganizationEntity {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly description: string | null
  readonly logo: string | null
  readonly website: string | null
  readonly ownerId: string
  readonly customRoles: CustomRoleDefinition[] | null
  readonly partnerType: string | null
  readonly partnerVerifiedAt: Date | null
  readonly partnerVerifiedBy: string | null
  readonly partnerVerificationProof: string | null
  readonly partnerExpiresAt: Date | null
  readonly partnerIsActive: boolean
  readonly deletedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: OrganizationEntityProps) {
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
    this.partnerVerifiedBy = props.partnerVerifiedBy
    this.partnerVerificationProof = props.partnerVerificationProof
    this.partnerExpiresAt = props.partnerExpiresAt
    this.partnerIsActive = props.partnerIsActive
    this.deletedAt = props.deletedAt
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  get isPartner(): boolean {
    return this.partnerIsActive && this.partnerType !== null
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null
  }

  get hasCustomRoles(): boolean {
    return this.customRoles !== null && this.customRoles.length > 0
  }
}
