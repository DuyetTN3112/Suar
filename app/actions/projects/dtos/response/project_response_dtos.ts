/**
 * Project Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

import type { CustomRoleDefinition } from '#types/database'

/**
 * ProjectDetailResponseDTO — Full project detail for admin/detail views
 */
export class ProjectDetailResponseDTO {
  constructor(
    public readonly id: string,
    public readonly creatorId: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly organizationId: string,
    public readonly startDate: Date | null,
    public readonly endDate: Date | null,
    public readonly status: string,
    public readonly budget: string,
    public readonly managerId: string | null,
    public readonly ownerId: string | null,
    public readonly visibility: string,
    public readonly allowFreelancer: boolean,
    public readonly approvalRequiredForMembers: boolean,
    public readonly tags: unknown[] | null,
    public readonly customRoles: CustomRoleDefinition[] | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}

/**
 * ProjectListItemResponseDTO — Compact project info for list views
 */
export class ProjectListItemResponseDTO {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly status: string,
    public readonly visibility: string,
    public readonly allowFreelancer: boolean,
    public readonly budget: string,
    public readonly startDate: Date | null,
    public readonly endDate: Date | null,
    public readonly createdAt: Date
  ) {}
}

/**
 * ProjectSummaryResponseDTO — Minimal project info (for references in other entities)
 */
export class ProjectSummaryResponseDTO {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly status: string,
    public readonly visibility: string
  ) {}
}
