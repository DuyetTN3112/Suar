import type { HttpContext } from '@adonisjs/core/http'

import {
  PAGINATION,
  toBoolean,
  toOptionalBoolean,
  toOptionalNullableString,
  toOptionalNumber,
  toOptionalString,
  toPositiveNumber,
} from './shared.js'

import { OrganizationUserStatus } from '#modules/organizations/public_contracts/access/organization_constants'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { UserPaginationDTO } from '#modules/users/actions/dtos/common/user_action_dtos'
import { ApproveUserDTO } from '#modules/users/actions/dtos/request/approve_user_dto'
import {
  GetUsersListDTO,
  UserFiltersDTO,
} from '#modules/users/actions/dtos/request/get_users_list_dto'
import { UpdateUserDetailsDTO } from '#modules/users/actions/dtos/request/update_user_details_dto'
import {
  AddUserSkillDTO,
  RemoveUserSkillDTO,
  UpdateUserSkillDTO,
} from '#modules/users/actions/dtos/request/profile-skills/user_skill_dtos'
import { GetCurrentProfileSnapshotDTO } from '#modules/users/actions/queries/profile/get_current_profile_snapshot_query'
import { GetFeaturedReviewsDTO } from '#modules/users/actions/queries/profile/get_featured_reviews_query'
import { GetProfileSnapshotHistoryDTO } from '#modules/users/actions/queries/profile/get_profile_snapshot_history_query'
import { GetPublicProfileSnapshotDTO } from '#modules/users/actions/queries/profile/get_public_profile_snapshot_query'
import { GetSpiderChartDataDTO } from '#modules/users/actions/queries/talent/get_spider_chart_data_query'
import { GetUserDeliveryMetricsDTO } from '#modules/users/actions/queries/talent/get_user_delivery_metrics_query'
import { GetUserProfileDTO } from '#modules/users/actions/queries/profile/get_user_profile_query'
import { GetUserSkillsDTO } from '#modules/users/actions/queries/profile-skills/get_user_skills_query'

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


const PENDING_APPROVAL_DEFAULT_LIMIT = 10
const SYSTEM_USERS_DEFAULT_LIMIT = 10
const PROFILE_SNAPSHOT_HISTORY_DEFAULT_LIMIT = 20
const FEATURED_REVIEWS_DEFAULT_LIMIT = 2

function readAliasedInput(
  request: HttpContext['request'],
  camelKey: string,
  snakeKey: string,
  fallback?: unknown
): unknown {
  return request.input(camelKey, request.input(snakeKey, fallback))
}

function buildUserPagination(
  request: HttpContext['request'],
  defaultLimit: number
): UserPaginationDTO {
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      limit: request.input('limit', defaultLimit) as unknown,
    },
    PAGINATION,
    { perPage: defaultLimit }
  )

  return new UserPaginationDTO(pagination.page, pagination.perPage)
}

export function buildAddUserSkillDTO(request: HttpContext['request']): AddUserSkillDTO {
  const skillId: unknown = request.input('skillId') ?? request.input('skill_id') ?? null
  const customSkillName: unknown =
    request.input('customSkillName') ?? request.input('custom_skill_name') ?? null
  const categoryCode: unknown =
    request.input('categoryCode') ?? request.input('category_code') ?? null
  const proficiencyCode: unknown =
    request.input('verifiedPublicProficiencyCode') ??
    request.input('verified_public_proficiency_code') ??
    request.input('levelCode') ??
    request.input('level_code')

  return AddUserSkillDTO.fromValidatedPayload(
    omitUndefined({
      skill_id: typeof skillId === 'string' ? skillId : null,
      custom_skill_name: typeof customSkillName === 'string' ? customSkillName : null,
      category_code: typeof categoryCode === 'string' ? categoryCode : null,
      verified_public_proficiency_code: typeof proficiencyCode === 'string' ? proficiencyCode : '',
    })
  )
}

export function buildApproveUserDTO(
  userId: string,
  organizationId: string,
  approverId: string
): ApproveUserDTO {
  return new ApproveUserDTO(userId, organizationId, approverId)
}

export function buildGetUserProfileDTO(
  userId: string,
  includeSkills = true,
  includeSpiderChart = true
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

export function buildPendingApprovalUsersListDTO(
  request: HttpContext['request'],
  organizationId: string
): GetUsersListDTO {
  return new GetUsersListDTO(
    buildUserPagination(request, PENDING_APPROVAL_DEFAULT_LIMIT),
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
  return new GetUsersListDTO(
    buildUserPagination(request, SYSTEM_USERS_DEFAULT_LIMIT),
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
  return omitUndefined({
    snapshotName: toOptionalString(
      (request.input('snapshotName') ?? request.input('snapshot_name')) as unknown
    ),
    isPublic: toOptionalBoolean(
      (request.input('isPublic') ?? request.input('is_public')) as unknown
    ),
    expiresInDays: toOptionalNumber(
      (request.input('expiresInDays') ?? request.input('expires_in_days')) as unknown
    ),
  })
}

export function buildRemoveUserSkillDTO(userSkillId: string): RemoveUserSkillDTO {
  return RemoveUserSkillDTO.fromUserSkillId(userSkillId)
}

export function buildRotateProfileSnapshotShareLinkDTO(snapshotId: string) {
  return {
    snapshotId,
  }
}

export function buildUpdateUserDetailsDTO(request: HttpContext['request']): UpdateUserDetailsDTO {
  return new UpdateUserDetailsDTO(
    omitUndefined({
      avatar_url: toOptionalNullableString(readAliasedInput(request, 'avatarUrl', 'avatar_url')),
      bio: toOptionalNullableString(request.input('bio') as unknown),
      phone: toOptionalNullableString(request.input('phone') as unknown),
      address: toOptionalNullableString(request.input('address') as unknown),
      timezone: toOptionalString(request.input('timezone') as unknown),
      language: toOptionalString(request.input('language') as unknown),
      is_external_contributor: toOptionalBoolean(
        readAliasedInput(
          request,
          'isExternalContributor',
          'is_external_contributor',
          readAliasedInput(request, 'isExternalContributor', 'is_external_contributor')
        )
      ),
    })
  )
}

export function buildUpdateUserSkillDTO(
  request: HttpContext['request'],
  userSkillId: string
): UpdateUserSkillDTO {
  return UpdateUserSkillDTO.fromValidatedPayload({
    user_skill_id: userSkillId,
    verified_public_proficiency_code: (request.input('verifiedPublicProficiencyCode') ??
      request.input('verified_public_proficiency_code') ??
      request.input('levelCode') ??
      request.input('level_code')) as string,
  })
}

export function buildUpdateProfileSnapshotAccessDTO(
  request: HttpContext['request'],
  snapshotId: string
) {
  return omitUndefined({
    snapshotId,
    isPublic: toBoolean(
      (request.input('isPublic') ?? request.input('is_public')) as unknown,
      false
    ),
    expiresInDays: toOptionalNumber(
      (request.input('expiresInDays') ?? request.input('expires_in_days')) as unknown
    ),
  })
}
