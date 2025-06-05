/**
 * OrganizationApplicationMapper — Application Layer Mapper
 *
 * Maps between Request DTOs ↔ Domain Entity ↔ Response DTOs.
 *
 * Flow:
 *   Write: Request DTO → Domain Entity (partial)
 *   Read:  Domain Entity → Response DTO
 */

import type { OrganizationEntity } from '#domain/organizations/entities/organization_entity'
import type { CreateOrganizationDTO } from '../dtos/request/create_organization_dto.js'
import {
  OrganizationDetailResponseDTO,
  OrganizationListItemResponseDTO,
  OrganizationSummaryResponseDTO,
} from '../dtos/response/organization_response_dtos.js'

export class OrganizationApplicationMapper {
  /**
   * CreateOrganizationDTO → partial domain entity props (for creation)
   */
  static fromCreateDTO(dto: CreateOrganizationDTO): {
    name: string
    slug: string
    description: string | null
    logo: string | null
    website: string | null
    plan: string
  } {
    const obj = dto.toObject()
    return {
      name: obj.name,
      slug: obj.slug,
      description: obj.description,
      logo: obj.logo,
      website: obj.website,
      plan: obj.plan,
    }
  }

  /**
   * Domain Entity → OrganizationDetailResponseDTO (full detail view)
   */
  static toDetailResponse(entity: OrganizationEntity): OrganizationDetailResponseDTO {
    return new OrganizationDetailResponseDTO(
      entity.id,
      entity.name,
      entity.slug,
      entity.description,
      entity.logo,
      entity.website,
      entity.plan,
      entity.ownerId,
      entity.customRoles,
      entity.partnerType,
      entity.partnerVerifiedAt,
      entity.partnerIsActive,
      entity.createdAt,
      entity.updatedAt
    )
  }

  /**
   * Domain Entity → OrganizationListItemResponseDTO (list view)
   */
  static toListItemResponse(entity: OrganizationEntity): OrganizationListItemResponseDTO {
    return new OrganizationListItemResponseDTO(
      entity.id,
      entity.name,
      entity.slug,
      entity.description,
      entity.logo,
      entity.plan,
      entity.ownerId,
      entity.partnerType,
      entity.partnerIsActive,
      entity.createdAt
    )
  }

  /**
   * Domain Entity → OrganizationSummaryResponseDTO (minimal reference)
   */
  static toSummaryResponse(entity: OrganizationEntity): OrganizationSummaryResponseDTO {
    return new OrganizationSummaryResponseDTO(entity.id, entity.name, entity.slug, entity.logo)
  }
}
