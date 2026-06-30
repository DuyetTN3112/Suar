/**
 * ProjectApplicationMapper — Application Layer Mapper
 *
 * Maps between Request DTOs ↔ Domain Entity ↔ Response DTOs.
 *
 * Flow:
 *   Write: Request DTO → Domain Entity (partial)
 *   Read:  Domain Entity → Response DTO
 */

import type { CreateProjectDTO } from '../../dtos/request/create_project_dto.js'
import {
  ProjectDetailResponseDTO,
  ProjectListItemResponseDTO,
  ProjectSummaryResponseDTO,
} from '../../dtos/response/project_response_dtos.js'

import type { ProjectEntity } from '#modules/projects/domain/project-context/project_entity'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


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
    businessDomains: string[]
  } {
    return omitUndefined({
      name: dto.name,
      description: dto.description,
      organizationId: dto.organization_id,
      status: dto.status,
      startDate: dto.start_date?.toJSDate() ?? null,
      endDate: dto.end_date?.toJSDate() ?? null,
      managerId: dto.manager_id ?? null,
      visibility: dto.visibility,
      businessDomains: dto.business_domains,
    })
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
