/**
 * OrganizationInfraMapper — Infrastructure Layer Mapper
 *
 * Maps between ORM Entity (Lucid Model) ↔ Domain Entity.
 *
 * Flow:
 *   Read:  ORM Entity → Domain Entity
 *   Write: Domain Entity → ORM Entity (partial, for create/update)
 */

import { OrganizationEntity } from '#domain/organizations/entities/organization_entity'
import type { OrganizationEntityProps } from '#domain/organizations/entities/organization_entity'
import type Organization from '#models/organization'

export class OrganizationInfraMapper {
  /**
   * ORM Entity (Lucid Model) → Domain Entity
   */
  static toDomain(model: Organization): OrganizationEntity {
    const props: OrganizationEntityProps = {
      id: model.id,
      name: model.name,
      slug: model.slug,
      description: model.description,
      logo: model.logo,
      website: model.website,
      plan: model.plan,
      ownerId: model.owner_id,
      customRoles: model.custom_roles,
      partnerType: model.partner_type,
      partnerVerifiedAt: model.partner_verified_at?.toJSDate() ?? null,
      partnerVerifiedBy: model.partner_verified_by,
      partnerVerificationProof: model.partner_verification_proof,
      partnerExpiresAt: model.partner_expires_at?.toJSDate() ?? null,
      partnerIsActive: model.partner_is_active ?? false,
      deletedAt: model.deleted_at?.toJSDate() ?? null,
      createdAt: model.created_at.toJSDate(),
      updatedAt: model.updated_at.toJSDate(),
    }
    return new OrganizationEntity(props)
  }

  /**
   * Domain Entity → ORM Entity fields (partial, for create/update)
   * Returns a plain object that can be used with Model.create() or model.merge()
   */
  static toOrm(entity: Partial<OrganizationEntityProps>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (entity.name !== undefined) result.name = entity.name
    if (entity.slug !== undefined) result.slug = entity.slug
    if (entity.description !== undefined) result.description = entity.description
    if (entity.logo !== undefined) result.logo = entity.logo
    if (entity.website !== undefined) result.website = entity.website
    if (entity.plan !== undefined) result.plan = entity.plan
    if (entity.ownerId !== undefined) result.owner_id = entity.ownerId
    if (entity.customRoles !== undefined) result.custom_roles = entity.customRoles
    if (entity.partnerType !== undefined) result.partner_type = entity.partnerType
    if (entity.partnerVerifiedAt !== undefined)
      result.partner_verified_at = entity.partnerVerifiedAt
    if (entity.partnerVerifiedBy !== undefined)
      result.partner_verified_by = entity.partnerVerifiedBy
    if (entity.partnerVerificationProof !== undefined)
      result.partner_verification_proof = entity.partnerVerificationProof
    if (entity.partnerExpiresAt !== undefined) result.partner_expires_at = entity.partnerExpiresAt
    if (entity.partnerIsActive !== undefined) result.partner_is_active = entity.partnerIsActive

    return result
  }
}
