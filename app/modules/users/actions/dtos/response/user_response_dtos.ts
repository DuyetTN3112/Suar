/**
 * User Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

import type { UserEntity } from '#modules/users/domain/entities/user_entity'
import type { UserProfileSettings, UserTrustData, UserCredibilityData } from '#types/database'

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
  isFreelancer: boolean
  freelancerRating: number | null
  freelancerCompletedTasksCount: number
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
  isFreelancer: boolean
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
  isFreelancer: boolean
  freelancerRating: number | null
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
  public readonly isFreelancer: boolean
  public readonly freelancerRating: number | null
  public readonly freelancerCompletedTasksCount: number
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
    this.isFreelancer = props.isFreelancer
    this.freelancerRating = props.freelancerRating
    this.freelancerCompletedTasksCount = props.freelancerCompletedTasksCount
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
      isFreelancer: entity.isFreelancer,
      freelancerRating: entity.freelancerRating,
      freelancerCompletedTasksCount: entity.freelancerCompletedTasksCount,
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
  public readonly isFreelancer: boolean
  public readonly createdAt: Date

  private constructor(props: UserListItemResponseDTOProps) {
    this.id = props.id
    this.username = props.username
    this.email = props.email
    this.status = props.status
    this.systemRole = props.systemRole
    this.avatarUrl = props.avatarUrl
    this.isFreelancer = props.isFreelancer
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
      isFreelancer: entity.isFreelancer,
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
  public readonly isFreelancer: boolean
  public readonly freelancerRating: number | null
  public readonly profileSettings: UserProfileSettings | null

  private constructor(props: UserProfileResponseDTOProps) {
    this.id = props.id
    this.username = props.username
    this.email = props.email
    this.avatarUrl = props.avatarUrl
    this.bio = props.bio
    this.timezone = props.timezone
    this.language = props.language
    this.isFreelancer = props.isFreelancer
    this.freelancerRating = props.freelancerRating
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
      isFreelancer: entity.isFreelancer,
      freelancerRating: entity.freelancerRating,
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
