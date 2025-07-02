/**
 * ProjectApplicationMapper — Application Layer Mapper
 *
 * Maps between Request DTOs ↔ Domain Entity ↔ Response DTOs.
 *
 * Flow:
 *   Write: Request DTO → Domain Entity (partial)
 *   Read:  Domain Entity → Response DTO
 */

import type { ProjectEntity } from '#domain/projects/entities/project_entity'
import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'
import {
  ProjectDetailResponseDTO,
  ProjectListItemResponseDTO,
  ProjectSummaryResponseDTO,
} from '../dtos/response/project_response_dtos.js'

export class ProjectApplicationMapper {
  private readonly __instanceMarker = true

  static {
    void new ProjectApplicationMapper().__instanceMarker
  }

  /**
   * CreateProjectDTO → partial domain entity props (for creation)
   */
  static fromCreateDTO(dto: CreateProjectDTO): {
    name: string
    description?: string
    organizationId: string
    status: string
    startDate: Date | null
    endDate: Date | null
    managerId: string | null
    visibility: string
    budget: number
  } {
    return {
      name: dto.name,
      description: dto.description,
      organizationId: dto.organization_id,
      status: dto.status,
      startDate: dto.start_date?.toJSDate() ?? null,
      endDate: dto.end_date?.toJSDate() ?? null,
      managerId: dto.manager_id ?? null,
      visibility: dto.visibility,
      budget: dto.budget,
    }
  }

  /**
   * Domain Entity → ProjectDetailResponseDTO (full detail view)
   */
  static toDetailResponse(entity: ProjectEntity): ProjectDetailResponseDTO {
    return new ProjectDetailResponseDTO({
      id: entity.id,
      creatorId: entity.creatorId,
      name: entity.name,
      description: entity.description,
      organizationId: entity.organizationId,
      startDate: entity.startDate,
      endDate: entity.endDate,
      status: entity.status,
      budget: entity.budget,
      managerId: entity.managerId,
      ownerId: entity.ownerId,
      visibility: entity.visibility,
      allowFreelancer: entity.allowFreelancer,
      approvalRequiredForMembers: entity.approvalRequiredForMembers,
      tags: entity.tags,
      customRoles: entity.customRoles,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    })
  }

  /**
   * Domain Entity → ProjectListItemResponseDTO (list view)
   */
  static toListItemResponse(entity: ProjectEntity): ProjectListItemResponseDTO {
    return new ProjectListItemResponseDTO({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      visibility: entity.visibility,
      allowFreelancer: entity.allowFreelancer,
      budget: entity.budget,
      startDate: entity.startDate,
      endDate: entity.endDate,
      createdAt: entity.createdAt,
    })
  }

  /**
   * Domain Entity → ProjectSummaryResponseDTO (minimal reference)
   */
  static toSummaryResponse(entity: ProjectEntity): ProjectSummaryResponseDTO {
    return new ProjectSummaryResponseDTO({
      id: entity.id,
      name: entity.name,
      status: entity.status,
      visibility: entity.visibility,
    })
  }
}
