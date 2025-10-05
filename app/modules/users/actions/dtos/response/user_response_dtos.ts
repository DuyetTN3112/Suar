/**
 * User Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

import type { UserEntity } from '#modules/users/domain/entities/user_entity'
import type { UserProfileSettings, UserTrustData, UserCredibilityData } from '#modules/users/types/user_profile_data'

export interface UserDetailResponseDTOProps {
  id: string
  username: string
  email: string | null
  status: string
  systemRole: string
  currentOrganizationId: string | null
  authMethod: string
  avatarUrl: string | null
  bio: string | null
  phone: string | null
  address: string | null
  timezone: string
  language: string
  isExternalContributor: boolean
  externalContributorRating: number | null
  externalContributorCompletedTasksCount: number
  profileSettings: UserProfileSettings | null
  trustData: UserTrustData | null
  credibilityData: UserCredibilityData | null
  createdAt: Date
  updatedAt: Date
}

export interface UserListItemResponseDTOProps {
  id: string
  username: string
  email: string | null
  status: string
  systemRole: string
  avatarUrl: string | null
  isExternalContributor: boolean
  createdAt: Date
}

export interface UserProfileResponseDTOProps {
  id: string
  username: string
  email: string | null
  avatarUrl: string | null
  bio: string | null
  timezone: string
  language: string
  isExternalContributor: boolean
  externalContributorRating: number | null
  profileSettings: UserProfileSettings | null
}

export interface UserSummaryResponseDTOProps {
  id: string
  username: string
  email: string | null
  avatarUrl: string | null
}

/**
 * UserDetailResponseDTO — Full user detail for admin/profile views
 */
export class UserDetailResponseDTO {
  public readonly id: string
  public readonly username: string
  public readonly email: string | null
  public readonly status: string
  public readonly systemRole: string
  public readonly currentOrganizationId: string | null
  public readonly authMethod: string
  public readonly avatarUrl: string | null
  public readonly bio: string | null
  public readonly phone: string | null
  public readonly address: string | null
  public readonly timezone: string
  public readonly language: string
  public readonly isExternalContributor: boolean
  public readonly externalContributorRating: number | null
  public readonly externalContributorCompletedTasksCount: number
  public readonly profileSettings: UserProfileSettings | null
  public readonly trustData: UserTrustData | null
  public readonly credibilityData: UserCredibilityData | null
  public readonly createdAt: Date
  public readonly updatedAt: Date

  private constructor(props: UserDetailResponseDTOProps) {
    this.id = props.id
    this.username = props.username
    this.email = props.email
    this.status = props.status
    this.systemRole = props.systemRole
    this.currentOrganizationId = props.currentOrganizationId
    this.authMethod = props.authMethod
    this.avatarUrl = props.avatarUrl
    this.bio = props.bio
    this.phone = props.phone
    this.address = props.address
    this.timezone = props.timezone
    this.language = props.language
    this.isExternalContributor = props.isExternalContributor
    this.externalContributorRating = props.externalContributorRating
    this.externalContributorCompletedTasksCount = props.externalContributorCompletedTasksCount
    this.profileSettings = props.profileSettings
    this.trustData = props.trustData
    this.credibilityData = props.credibilityData
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static fromProps(props: UserDetailResponseDTOProps): UserDetailResponseDTO {
    return new UserDetailResponseDTO(props)
  }

  static fromEntity(entity: UserEntity): UserDetailResponseDTO {
    return new UserDetailResponseDTO({
      id: entity.id,
      username: entity.username,
      email: entity.email,
      status: entity.status,
      systemRole: entity.systemRole,
      currentOrganizationId: entity.currentOrganizationId,
      authMethod: entity.authMethod,
      avatarUrl: entity.avatarUrl,
      bio: entity.bio,
      phone: entity.phone,
      address: entity.address,
      timezone: entity.timezone,
      language: entity.language,
      isExternalContributor: entity.isExternalContributor,
      externalContributorRating: entity.externalContributorRating,
      externalContributorCompletedTasksCount: entity.externalContributorCompletedTasksCount,
      profileSettings: entity.profileSettings,
      trustData: entity.trustData,
      credibilityData: entity.credibilityData,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    })
  }
}

/**
 * UserListItemResponseDTO — Compact user info for list views
 */
export class UserListItemResponseDTO {
  public readonly id: string
  public readonly username: string
  public readonly email: string | null
  public readonly status: string
  public readonly systemRole: string
  public readonly avatarUrl: string | null
  public readonly isExternalContributor: boolean
  public readonly createdAt: Date

  private constructor(props: UserListItemResponseDTOProps) {
    this.id = props.id
    this.username = props.username
    this.email = props.email
    this.status = props.status
    this.systemRole = props.systemRole
    this.avatarUrl = props.avatarUrl
    this.isExternalContributor = props.isExternalContributor
    this.createdAt = props.createdAt
  }

  static fromProps(props: UserListItemResponseDTOProps): UserListItemResponseDTO {
    return new UserListItemResponseDTO(props)
  }

  static fromEntity(entity: UserEntity): UserListItemResponseDTO {
    return new UserListItemResponseDTO({
      id: entity.id,
      username: entity.username,
      email: entity.email,
      status: entity.status,
      systemRole: entity.systemRole,
      avatarUrl: entity.avatarUrl,
      isExternalContributor: entity.isExternalContributor,
      createdAt: entity.createdAt,
    })
  }
}

/**
 * UserProfileResponseDTO — Public profile view
 */
export class UserProfileResponseDTO {
  public readonly id: string
  public readonly username: string
  public readonly email: string | null
  public readonly avatarUrl: string | null
  public readonly bio: string | null
  public readonly timezone: string
  public readonly language: string
  public readonly isExternalContributor: boolean
  public readonly externalContributorRating: number | null
  public readonly profileSettings: UserProfileSettings | null

  private constructor(props: UserProfileResponseDTOProps) {
    this.id = props.id
    this.username = props.username
    this.email = props.email
    this.avatarUrl = props.avatarUrl
    this.bio = props.bio
    this.timezone = props.timezone
    this.language = props.language
    this.isExternalContributor = props.isExternalContributor
    this.externalContributorRating = props.externalContributorRating
    this.profileSettings = props.profileSettings
  }

  static fromProps(props: UserProfileResponseDTOProps): UserProfileResponseDTO {
    return new UserProfileResponseDTO(props)
  }

  static fromEntity(entity: UserEntity): UserProfileResponseDTO {
    return new UserProfileResponseDTO({
      id: entity.id,
      username: entity.username,
      email: entity.email,
      avatarUrl: entity.avatarUrl,
      bio: entity.bio,
      timezone: entity.timezone,
      language: entity.language,
      isExternalContributor: entity.isExternalContributor,
      externalContributorRating: entity.externalContributorRating,
      profileSettings: entity.profileSettings,
    })
  }
}

/**
 * UserSummaryResponseDTO — Minimal user info (for references in other entities)
 */
export class UserSummaryResponseDTO {
  public readonly id: string
  public readonly username: string
  public readonly email: string | null
  public readonly avatarUrl: string | null

  private constructor(props: UserSummaryResponseDTOProps) {
    this.id = props.id
    this.username = props.username
    this.email = props.email
    this.avatarUrl = props.avatarUrl
  }

  static fromProps(props: UserSummaryResponseDTOProps): UserSummaryResponseDTO {
    return new UserSummaryResponseDTO(props)
  }

  static fromEntity(entity: UserEntity): UserSummaryResponseDTO {
    return new UserSummaryResponseDTO({
      id: entity.id,
      username: entity.username,
      email: entity.email,
      avatarUrl: entity.avatarUrl,
    })
  }
}
