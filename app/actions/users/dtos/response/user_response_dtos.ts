/**
 * User Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

import type { UserProfileSettings, UserTrustData, UserCredibilityData } from '#types/database'

/**
 * UserDetailResponseDTO — Full user detail for admin/profile views
 */
export class UserDetailResponseDTO {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string | null,
    public readonly status: string,
    public readonly systemRole: string,
    public readonly currentOrganizationId: string | null,
    public readonly authMethod: string,
    public readonly avatarUrl: string | null,
    public readonly bio: string | null,
    public readonly phone: string | null,
    public readonly address: string | null,
    public readonly timezone: string,
    public readonly language: string,
    public readonly isFreelancer: boolean,
    public readonly freelancerRating: number | null,
    public readonly freelancerCompletedTasksCount: number,
    public readonly profileSettings: UserProfileSettings | null,
    public readonly trustData: UserTrustData | null,
    public readonly credibilityData: UserCredibilityData | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}

/**
 * UserListItemResponseDTO — Compact user info for list views
 */
export class UserListItemResponseDTO {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string | null,
    public readonly status: string,
    public readonly systemRole: string,
    public readonly avatarUrl: string | null,
    public readonly isFreelancer: boolean,
    public readonly createdAt: Date
  ) {}
}

/**
 * UserProfileResponseDTO — Public profile view
 */
export class UserProfileResponseDTO {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string | null,
    public readonly avatarUrl: string | null,
    public readonly bio: string | null,
    public readonly timezone: string,
    public readonly language: string,
    public readonly isFreelancer: boolean,
    public readonly freelancerRating: number | null,
    public readonly profileSettings: UserProfileSettings | null
  ) {}
}

/**
 * UserSummaryResponseDTO — Minimal user info (for references in other entities)
 */
export class UserSummaryResponseDTO {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string | null,
    public readonly avatarUrl: string | null
  ) {}
}
