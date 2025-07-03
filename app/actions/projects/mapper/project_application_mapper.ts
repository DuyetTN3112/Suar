/**
 * ProjectApplicationMapper — Application Layer Mapper
 *
 * Maps between Request DTOs ↔ Domain Entity ↔ Response DTOs.
 *
 * Flow:
 *   Write: Request DTO → Domain Entity (partial)
 *   Read:  Domain Entity → Response DTO
 */

import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'
import {
  ProjectDetailResponseDTO,
  ProjectListItemResponseDTO,
  ProjectSummaryResponseDTO,
} from '../dtos/response/project_response_dtos.js'

import type { ProjectEntity } from '#domain/projects/entities/project_entity'

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
    return ProjectDetailResponseDTO.fromEntity(entity)
  }

  /**
   * Domain Entity → ProjectListItemResponseDTO (list view)
   */
  static toListItemResponse(entity: ProjectEntity): ProjectListItemResponseDTO {
    return ProjectListItemResponseDTO.fromEntity(entity)
  }

  /**
   * Domain Entity → ProjectSummaryResponseDTO (minimal reference)
   */
  static toSummaryResponse(entity: ProjectEntity): ProjectSummaryResponseDTO {
    return ProjectSummaryResponseDTO.fromEntity(entity)
  }
}
