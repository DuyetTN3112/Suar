/**
 * Project Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

import type { ProjectEntity } from '#modules/projects/domain/project-context/project_entity'
import type { ProjectCustomRoleDefinition as CustomRoleDefinition } from '#modules/projects/public_contracts/custom_role_definition'

export interface ProjectDetailResponseDTOProps {
  id: string
  creatorId: string
  name: string
  description: string | null
  organizationId: string
  startDate: Date | null
  endDate: Date | null
  status: string
  managerId: string | null
  ownerId: string | null
  visibility: string
  allowExternalContributors: boolean
  approvalRequiredForMembers: boolean
  tags: unknown[] | null
  customRoles: CustomRoleDefinition[] | null
  createdAt: Date
  updatedAt: Date
}

export interface ProjectListItemResponseDTOProps {
  id: string
  name: string
  description: string | null
  status: string
  visibility: string
  allowExternalContributors: boolean
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
}

export interface ProjectSummaryResponseDTOProps {
  id: string
  name: string
  status: string
  visibility: string
}

/**
 * ProjectDetailResponseDTO — Full project detail for admin/detail views
 */
export class ProjectDetailResponseDTO {
  public readonly id: string
  public readonly creatorId: string
  public readonly name: string
  public readonly description: string | null
  public readonly organizationId: string
  public readonly startDate: Date | null
  public readonly endDate: Date | null
  public readonly status: string
  public readonly managerId: string | null
  public readonly ownerId: string | null
  public readonly visibility: string
  public readonly allowExternalContributors: boolean
  public readonly approvalRequiredForMembers: boolean
  public readonly tags: unknown[] | null
  public readonly customRoles: CustomRoleDefinition[] | null
  public readonly createdAt: Date
  public readonly updatedAt: Date

  private constructor(props: ProjectDetailResponseDTOProps) {
    this.id = props.id
    this.creatorId = props.creatorId
    this.name = props.name
    this.description = props.description
    this.organizationId = props.organizationId
    this.startDate = props.startDate
    this.endDate = props.endDate
    this.status = props.status
    this.managerId = props.managerId
    this.ownerId = props.ownerId
    this.visibility = props.visibility
    this.allowExternalContributors = props.allowExternalContributors
    this.approvalRequiredForMembers = props.approvalRequiredForMembers
    this.tags = props.tags
    this.customRoles = props.customRoles
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static fromProps(props: ProjectDetailResponseDTOProps): ProjectDetailResponseDTO {
    return new ProjectDetailResponseDTO(props)
  }

  static fromEntity(entity: ProjectEntity): ProjectDetailResponseDTO {
    return new ProjectDetailResponseDTO({
      id: entity.id,
      creatorId: entity.creatorId,
      name: entity.name,
      description: entity.description,
      organizationId: entity.organizationId,
      startDate: entity.startDate,
      endDate: entity.endDate,
      status: entity.status,
      managerId: entity.managerId,
      ownerId: entity.ownerId,
      visibility: entity.visibility,
      allowExternalContributors: entity.allowExternalContributors,
      approvalRequiredForMembers: entity.approvalRequiredForMembers,
      tags: entity.tags,
      customRoles: entity.customRoles,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    })
  }
}

/**
 * ProjectListItemResponseDTO — Compact project info for list views
 */
export class ProjectListItemResponseDTO {
  public readonly id: string
  public readonly name: string
  public readonly description: string | null
  public readonly status: string
  public readonly visibility: string
  public readonly allowExternalContributors: boolean
  public readonly startDate: Date | null
  public readonly endDate: Date | null
  public readonly createdAt: Date

  private constructor(props: ProjectListItemResponseDTOProps) {
    this.id = props.id
    this.name = props.name
    this.description = props.description
    this.status = props.status
    this.visibility = props.visibility
    this.allowExternalContributors = props.allowExternalContributors
    this.startDate = props.startDate
    this.endDate = props.endDate
    this.createdAt = props.createdAt
  }

  static fromProps(props: ProjectListItemResponseDTOProps): ProjectListItemResponseDTO {
    return new ProjectListItemResponseDTO(props)
  }

  static fromEntity(entity: ProjectEntity): ProjectListItemResponseDTO {
    return new ProjectListItemResponseDTO({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      visibility: entity.visibility,
      allowExternalContributors: entity.allowExternalContributors,
      startDate: entity.startDate,
      endDate: entity.endDate,
      createdAt: entity.createdAt,
    })
  }
}

/**
 * ProjectSummaryResponseDTO — Minimal project info (for references in other entities)
 */
export class ProjectSummaryResponseDTO {
  public readonly id: string
  public readonly name: string
  public readonly status: string
  public readonly visibility: string

  private constructor(props: ProjectSummaryResponseDTOProps) {
    this.id = props.id
    this.name = props.name
    this.status = props.status
    this.visibility = props.visibility
  }

  static fromProps(props: ProjectSummaryResponseDTOProps): ProjectSummaryResponseDTO {
    return new ProjectSummaryResponseDTO(props)
  }

  static fromEntity(entity: ProjectEntity): ProjectSummaryResponseDTO {
    return new ProjectSummaryResponseDTO({
      id: entity.id,
      name: entity.name,
      status: entity.status,
      visibility: entity.visibility,
    })
  }
}
