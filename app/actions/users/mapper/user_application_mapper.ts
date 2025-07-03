/**
 * UserApplicationMapper — Application Layer Mapper
 *
 * Maps between Request DTOs ↔ Domain Entity ↔ Response DTOs.
 *
 * Flow:
 *   Write: Request DTO → Domain Entity (partial)
 *   Read:  Domain Entity → Response DTO
 */

import { type UserEntity } from '#domain/users/entities/user_entity'
import type { RegisterUserDTO } from '../dtos/request/register_user_dto.js'
import type { UpdateUserProfileDTO } from '../dtos/request/update_user_profile_dto.js'
import type { UpdateUserDetailsDTO } from '../dtos/request/update_user_details_dto.js'
import {
  UserDetailResponseDTO,
  UserListItemResponseDTO,
  UserProfileResponseDTO,
  UserSummaryResponseDTO,
} from '../dtos/response/user_response_dtos.js'

export class UserApplicationMapper {
  private readonly __instanceMarker = true

  static {
    void new UserApplicationMapper().__instanceMarker
  }

  /**
   * RegisterUserDTO → partial domain entity props (for creation)
   */
  static fromRegisterDTO(dto: RegisterUserDTO): {
    username: string
    email: string
    systemRole: string
    status: string
  } {
    return {
      username: dto.username,
      email: dto.email,
      systemRole: dto.roleId,
      status: dto.statusId,
    }
  }

  /**
   * UpdateUserProfileDTO → partial update fields
   */
  static fromUpdateProfileDTO(dto: UpdateUserProfileDTO): {
    username?: string
    email?: string
  } {
    const result: { username?: string; email?: string } = {}
    if (dto.username !== undefined) result.username = dto.username
    if (dto.email !== undefined) result.email = dto.email
    return result
  }

  /**
   * UpdateUserDetailsDTO → partial update fields
   */
  static fromUpdateDetailsDTO(dto: UpdateUserDetailsDTO): {
    avatarUrl?: string | null
    bio?: string | null
    phone?: string | null
    address?: string | null
    timezone?: string
    language?: string
    isFreelancer?: boolean
  } {
    const result: Record<string, unknown> = {}
    if (dto.avatar_url !== undefined) result.avatarUrl = dto.avatar_url
    if (dto.bio !== undefined) result.bio = dto.bio
    if (dto.phone !== undefined) result.phone = dto.phone
    if (dto.address !== undefined) result.address = dto.address
    if (dto.timezone !== undefined) result.timezone = dto.timezone
    if (dto.language !== undefined) result.language = dto.language
    if (dto.is_freelancer !== undefined) result.isFreelancer = dto.is_freelancer
    return result as ReturnType<typeof UserApplicationMapper.fromUpdateDetailsDTO>
  }

  /**
   * Domain Entity → UserDetailResponseDTO (full detail view)
   */
  static toDetailResponse(entity: UserEntity): UserDetailResponseDTO {
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

  /**
   * Domain Entity → UserListItemResponseDTO (list view)
   */
  static toListItemResponse(entity: UserEntity): UserListItemResponseDTO {
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

  /**
   * Domain Entity → UserProfileResponseDTO (public profile view)
   */
  static toProfileResponse(entity: UserEntity): UserProfileResponseDTO {
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

  /**
   * Domain Entity → UserSummaryResponseDTO (minimal reference)
   */
  static toSummaryResponse(entity: UserEntity): UserSummaryResponseDTO {
    return new UserSummaryResponseDTO({
      id: entity.id,
      username: entity.username,
      email: entity.email,
      avatarUrl: entity.avatarUrl,
    })
  }
}
