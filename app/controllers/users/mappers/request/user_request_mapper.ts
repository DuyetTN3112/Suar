import type { HttpContext } from '@adonisjs/core/http'
import { PaginationDTO } from '#actions/shared/index'
import {
  AddUserSkillDTO,
  RemoveUserSkillDTO,
  UpdateUserSkillDTO,
} from '#actions/users/dtos/request/user_skill_dtos'
import { ApproveUserDTO } from '#actions/users/dtos/request/approve_user_dto'
import { GetUserDetailDTO } from '#actions/users/dtos/request/get_user_detail_dto'
import { GetUsersListDTO, UserFiltersDTO } from '#actions/users/dtos/request/get_users_list_dto'
import { RegisterUserDTO } from '#actions/users/dtos/request/register_user_dto'
import { UpdateUserProfileDTO } from '#actions/users/dtos/request/update_user_profile_dto'
import { ChangeUserRoleDTO } from '#actions/users/dtos/request/change_user_role_dto'
import { UpdateUserDetailsDTO } from '#actions/users/dtos/request/update_user_details_dto'
import { GetUserProfileDTO } from '#actions/users/queries/get_user_profile_query'
import { GetUserSkillsDTO } from '#actions/users/queries/get_user_skills_query'
import { GetSpiderChartDataDTO } from '#actions/users/queries/get_spider_chart_data_query'
import { GetUserDeliveryMetricsDTO } from '#actions/users/queries/get_user_delivery_metrics_query'
import { GetFeaturedReviewsDTO } from '#actions/users/queries/get_featured_reviews_query'
import { GetCurrentProfileSnapshotDTO } from '#actions/users/queries/get_current_profile_snapshot_query'
import { GetProfileSnapshotHistoryDTO } from '#actions/users/queries/get_profile_snapshot_history_query'
import { GetPublicProfileSnapshotDTO } from '#actions/users/queries/get_public_profile_snapshot_query'
import { OrganizationUserStatus } from '#constants/organization_constants'
import { UserStatusName } from '#constants/user_constants'
import {
  PAGINATION,
  toBoolean,
  toOptionalBoolean,
  toOptionalNullableString,
  toOptionalNumber,
  toOptionalString,
  toPositiveNumber,
} from './shared.js'

const USERS_DEFAULT_LIMIT = 10
const PENDING_APPROVAL_DEFAULT_LIMIT = 10
const SYSTEM_USERS_DEFAULT_LIMIT = 10
const PROFILE_SNAPSHOT_HISTORY_DEFAULT_LIMIT = 20
const FEATURED_REVIEWS_DEFAULT_LIMIT = 2

export function buildAddUserSkillDTO(request: HttpContext['request']): AddUserSkillDTO {
  return AddUserSkillDTO.fromValidatedPayload({
    skill_id: request.input('skill_id') as string,
    level_code: request.input('level_code') as string,
  })
}

export function buildApproveUserDTO(
  userId: string,
  organizationId: string,
  approverId: string
): ApproveUserDTO {
  return new ApproveUserDTO(userId, organizationId, approverId)
}

export function buildGetUserDetailDTO(userId: string): GetUserDetailDTO {
  return new GetUserDetailDTO(userId)
}

export function buildGetUserProfileDTO(
  userId: string,
  includeSkills: boolean = true,
  includeSpiderChart: boolean = true
): GetUserProfileDTO {
  return new GetUserProfileDTO(userId, includeSkills, includeSpiderChart)
}

export function buildGetUserSkillsDTO(userId: string, categoryCode?: string): GetUserSkillsDTO {
  return new GetUserSkillsDTO(userId, categoryCode)
}

export function buildGetSpiderChartDataDTO(userId: string): GetSpiderChartDataDTO {
  return new GetSpiderChartDataDTO(userId)
}

export function buildGetUserDeliveryMetricsDTO(userId: string): GetUserDeliveryMetricsDTO {
  return new GetUserDeliveryMetricsDTO(userId)
}

export function buildGetFeaturedReviewsDTO(
  userId: string,
  limit: number = FEATURED_REVIEWS_DEFAULT_LIMIT
): GetFeaturedReviewsDTO {
  return new GetFeaturedReviewsDTO(userId, limit)
}

export function buildGetCurrentProfileSnapshotDTO(userId: string): GetCurrentProfileSnapshotDTO {
  return new GetCurrentProfileSnapshotDTO(userId)
}

export function buildGetProfileSnapshotHistoryDTO(
  request: HttpContext['request'],
  userId: string
): GetProfileSnapshotHistoryDTO {
  const limit = toPositiveNumber(
    request.input('limit', PROFILE_SNAPSHOT_HISTORY_DEFAULT_LIMIT) as unknown,
    PROFILE_SNAPSHOT_HISTORY_DEFAULT_LIMIT
  )

  return new GetProfileSnapshotHistoryDTO(userId, limit)
}

export function buildGetPublicProfileSnapshotDTO(
  request: HttpContext['request'],
  slug: string
): GetPublicProfileSnapshotDTO {
  return new GetPublicProfileSnapshotDTO(
    slug,
    toOptionalString(request.input('token') as unknown) ?? null
  )
}

export function buildUsersListDTO(
  request: HttpContext['request'],
  organizationId: string
): GetUsersListDTO {
  const page = toPositiveNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown, 1)
  const limit = toPositiveNumber(
    request.input('limit', USERS_DEFAULT_LIMIT) as unknown,
    USERS_DEFAULT_LIMIT
  )

  return new GetUsersListDTO(
    new PaginationDTO(page, limit),
    organizationId,
    new UserFiltersDTO(
      toOptionalString(request.input('search') as unknown),
      toOptionalString((request.input('role') ?? request.input('system_role')) as unknown),
      toOptionalString(request.input('status') as unknown),
      UserStatusName.INACTIVE,
      OrganizationUserStatus.APPROVED
    )
  )
}

export function buildPendingApprovalUsersListDTO(
  request: HttpContext['request'],
  organizationId: string
): GetUsersListDTO {
  const page = toPositiveNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown, 1)
  const limit = toPositiveNumber(
    request.input('limit', PENDING_APPROVAL_DEFAULT_LIMIT) as unknown,
    PENDING_APPROVAL_DEFAULT_LIMIT
  )

  return new GetUsersListDTO(
    new PaginationDTO(page, limit),
    organizationId,
    new UserFiltersDTO(
      toOptionalString(request.input('search') as unknown),
      undefined,
      undefined,
      undefined,
      OrganizationUserStatus.PENDING
    )
  )
}

export function buildSystemUsersListDTO(
  request: HttpContext['request'],
  organizationId: string
): GetUsersListDTO {
  const page = toPositiveNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown, 1)
  const limit = toPositiveNumber(
    request.input('limit', SYSTEM_USERS_DEFAULT_LIMIT) as unknown,
    SYSTEM_USERS_DEFAULT_LIMIT
  )

  return new GetUsersListDTO(
    new PaginationDTO(page, limit),
    organizationId,
    new UserFiltersDTO(
      toOptionalString(request.input('search', '') as unknown),
      undefined,
      undefined,
      undefined,
      undefined,
      true
    )
  )
}

export function buildPublishUserProfileSnapshotDTO(request: HttpContext['request']) {
  return {
    snapshotName: toOptionalString(request.input('snapshot_name') as unknown),
    isPublic: toOptionalBoolean(request.input('is_public') as unknown),
    expiresInDays: toOptionalNumber(request.input('expires_in_days') as unknown),
  }
}

export function buildRemoveUserSkillDTO(userSkillId: string): RemoveUserSkillDTO {
  return RemoveUserSkillDTO.fromUserSkillId(userSkillId)
}

export function buildRotateProfileSnapshotShareLinkDTO(snapshotId: string) {
  return {
    snapshotId,
  }
}

export function buildRegisterUserDTO(request: HttpContext['request']): RegisterUserDTO {
  return new RegisterUserDTO(
    request.input('username') as string,
    request.input('email') as string,
    (request.input('system_role') ?? request.input('role') ?? '') as string,
    (request.input('status') ?? '') as string
  )
}

export function buildUpdateUserDetailsDTO(request: HttpContext['request']): UpdateUserDetailsDTO {
  return new UpdateUserDetailsDTO({
    avatar_url: toOptionalNullableString(request.input('avatar_url') as unknown),
    bio: toOptionalNullableString(request.input('bio') as unknown),
    phone: toOptionalNullableString(request.input('phone') as unknown),
    address: toOptionalNullableString(request.input('address') as unknown),
    timezone: toOptionalString(request.input('timezone') as unknown),
    language: toOptionalString(request.input('language') as unknown),
    is_freelancer: toOptionalBoolean(request.input('is_freelancer') as unknown),
  })
}

export function buildUpdateUserSkillDTO(
  request: HttpContext['request'],
  userSkillId: string
): UpdateUserSkillDTO {
  return UpdateUserSkillDTO.fromValidatedPayload({
    user_skill_id: userSkillId,
    level_code: request.input('level_code') as string,
  })
}

export function buildUpdateProfileSnapshotAccessDTO(
  request: HttpContext['request'],
  snapshotId: string
) {
  return {
    snapshotId,
    isPublic: toBoolean(request.input('is_public') as unknown, false),
    expiresInDays: toOptionalNumber(request.input('expires_in_days') as unknown),
  }
}

export function buildUpdateUserProfileDTO(
  request: HttpContext['request'],
  userId: string
): UpdateUserProfileDTO {
  return new UpdateUserProfileDTO(
    userId,
    toOptionalString(request.input('username') as unknown),
    toOptionalString(request.input('email') as unknown)
  )
}

export function buildChangeUserRoleDTO(
  request: HttpContext['request'],
  targetUserId: string,
  changerId: string
): ChangeUserRoleDTO {
  return new ChangeUserRoleDTO(
    targetUserId,
    (request.input('role') ?? request.input('system_role') ?? '') as string,
    changerId
  )
}

export function buildDeleteUserInput(userId: string) {
  return { id: userId }
}
