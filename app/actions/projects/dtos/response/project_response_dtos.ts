/**
 * Project Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

import type { CustomRoleDefinition } from '#types/database'

export interface ProjectDetailResponseDTOProps {
  id: string
  creatorId: string
  name: string
  description: string | null
  organizationId: string
  startDate: Date | null
  endDate: Date | null
  status: string
  budget: string
  managerId: string | null
  ownerId: string | null
  visibility: string
  allowFreelancer: boolean
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
  allowFreelancer: boolean
  budget: string
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
  public readonly budget: string
  public readonly managerId: string | null
  public readonly ownerId: string | null
  public readonly visibility: string
  public readonly allowFreelancer: boolean
  public readonly approvalRequiredForMembers: boolean
  public readonly tags: unknown[] | null
  public readonly customRoles: CustomRoleDefinition[] | null
  public readonly createdAt: Date
  public readonly updatedAt: Date

  constructor(props: ProjectDetailResponseDTOProps) {
    this.id = props.id
    this.creatorId = props.creatorId
    this.name = props.name
    this.description = props.description
    this.organizationId = props.organizationId
    this.startDate = props.startDate
    this.endDate = props.endDate
    this.status = props.status
    this.budget = props.budget
    this.managerId = props.managerId
    this.ownerId = props.ownerId
    this.visibility = props.visibility
    this.allowFreelancer = props.allowFreelancer
    this.approvalRequiredForMembers = props.approvalRequiredForMembers
    this.tags = props.tags
    this.customRoles = props.customRoles
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
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
  public readonly allowFreelancer: boolean
  public readonly budget: string
  public readonly startDate: Date | null
  public readonly endDate: Date | null
  public readonly createdAt: Date

  constructor(props: ProjectListItemResponseDTOProps) {
    this.id = props.id
    this.name = props.name
    this.description = props.description
    this.status = props.status
    this.visibility = props.visibility
    this.allowFreelancer = props.allowFreelancer
    this.budget = props.budget
    this.startDate = props.startDate
    this.endDate = props.endDate
    this.createdAt = props.createdAt
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

  constructor(props: ProjectSummaryResponseDTOProps) {
    this.id = props.id
    this.name = props.name
    this.status = props.status
    this.visibility = props.visibility
  }
}
