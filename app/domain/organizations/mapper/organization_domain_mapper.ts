/**
 * OrganizationDomainMapper — Domain Layer Mapper
 *
 * Mapper thuần trong domain layer — KHÔNG import bất kỳ thứ gì từ
 * database, ORM hay framework.
 *
 * Chức năng:
 * - Tạo entity từ plain object (OrganizationEntityProps)
 * - Export entity ra plain object
 *
 * Lưu ý: Việc map từ ORM Model → Domain Entity nằm ở INFRA layer,
 * KHÔNG phải ở đây.
 */

import { OrganizationEntity } from '../entities/organization_entity.js'
import type { OrganizationEntityProps } from '../entities/organization_entity.js'

export class OrganizationDomainMapper {
  /**
   * Plain object (props) → Domain Entity
   */
  static toEntity(props: OrganizationEntityProps): OrganizationEntity {
    return new OrganizationEntity(props)
  }

  /**
   * Domain Entity → Plain object (props)
   */
  static toProps(entity: OrganizationEntity): OrganizationEntityProps {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      logo: entity.logo,
      website: entity.website,
      plan: entity.plan,
      ownerId: entity.ownerId,
      customRoles: entity.customRoles,
      partnerType: entity.partnerType,
      partnerVerifiedAt: entity.partnerVerifiedAt,
      partnerVerifiedBy: entity.partnerVerifiedBy,
      partnerVerificationProof: entity.partnerVerificationProof,
      partnerExpiresAt: entity.partnerExpiresAt,
      partnerIsActive: entity.partnerIsActive,
      deletedAt: entity.deletedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }
}
