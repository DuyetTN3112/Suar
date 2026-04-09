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
  private readonly __instanceMarker = true

  static {
    void new OrganizationApplicationMapper().__instanceMarker
  }

  /**
   * CreateOrganizationDTO → partial domain entity props (for creation)
   */
  static fromCreateDTO(dto: CreateOrganizationDTO): {
    name: string
    slug: string
    description: string | null
    logo: string | null
    website: string | null
  } {
    const obj = dto.toObject()
    return {
      name: obj.name,
      slug: obj.slug,
      description: obj.description,
      logo: obj.logo,
      website: obj.website,
    }
  }

  /**
   * Domain Entity → OrganizationDetailResponseDTO (full detail view)
   */
  static toDetailResponse(entity: OrganizationEntity): OrganizationDetailResponseDTO {
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

  /**
   * Domain Entity → OrganizationListItemResponseDTO (list view)
   */
  static toListItemResponse(entity: OrganizationEntity): OrganizationListItemResponseDTO {
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

  /**
   * Domain Entity → OrganizationSummaryResponseDTO (minimal reference)
   */
  static toSummaryResponse(entity: OrganizationEntity): OrganizationSummaryResponseDTO {
    return new OrganizationSummaryResponseDTO({
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      logo: entity.logo,
    })
  }
}
