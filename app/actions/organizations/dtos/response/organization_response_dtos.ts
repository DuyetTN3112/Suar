/**
 * Organization Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

import type { CustomRoleDefinition } from '#types/database'

/**
 * OrganizationDetailResponseDTO — Full organization detail for detail views
 */
export class OrganizationDetailResponseDTO {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description: string | null,
    public readonly logo: string | null,
    public readonly website: string | null,
    public readonly ownerId: string,
    public readonly customRoles: CustomRoleDefinition[] | null,
    public readonly partnerType: string | null,
    public readonly partnerVerifiedAt: Date | null,
    public readonly partnerIsActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}

/**
 * OrganizationListItemResponseDTO — Compact organization info for list views
 */
export class OrganizationListItemResponseDTO {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description: string | null,
    public readonly logo: string | null,
    public readonly ownerId: string,
    public readonly partnerType: string | null,
    public readonly partnerIsActive: boolean,
    public readonly createdAt: Date
  ) {}
}

/**
 * OrganizationSummaryResponseDTO — Minimal organization info (for references in other entities)
 */
export class OrganizationSummaryResponseDTO {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly logo: string | null
  ) {}
}
