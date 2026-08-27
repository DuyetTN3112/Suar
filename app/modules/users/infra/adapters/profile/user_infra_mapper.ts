/**
 * UserInfraMapper — Infrastructure Layer Mapper
 *
 * Maps between ORM Entity (Lucid Model) ↔ Domain Entity.
 *
 * Flow:
 *   Read:  ORM Entity → Domain Entity
 *   Write: Domain Entity → ORM Entity (partial, for create/update)
 */

import { UserEntity } from '#modules/users/domain/entities/user_entity'
import type { UserEntityProps } from '#modules/users/domain/entities/user_entity'
import type User from '#modules/users/infra/models/profile/user'
import type UserSkill from '#modules/users/infra/models/profile-skills/user_skill'
import type { UserProfileRecord, UserRecord, UserSkillRecord } from '#modules/users/types/user_records'

interface UserCurrentOrganizationProjection {
  id: string
  name: string
  slug: string
  logo: string | null
}

function serializeDateTime(value: { toISO(): string | null } | null | undefined): string | null {
  return value?.toISO() ?? null
}

export class UserInfraMapper {
  private readonly __instanceMarker = true

  static {
    void new UserInfraMapper().__instanceMarker
  }

  /**
   * ORM Entity (Lucid Model) → Domain Entity
   */
  static toDomain(model: User): UserEntity {
    const props: UserEntityProps = {
      id: model.id,
      username: model.username,
      email: model.email,
      status: model.status as UserEntityProps['status'],
      systemRole: model.system_role as UserEntityProps['systemRole'],
      currentOrganizationId: model.current_organization_id,
      authMethod: model.auth_method,
      avatarUrl: model.avatar_url,
      bio: model.bio,
      phone: model.phone,
      address: model.address,
      timezone: model.timezone,
      language: model.language,
      isExternalContributor: model.is_external_contributor,
      externalContributorRating: model.external_contributor_rating,
      externalContributorCompletedTasksCount: model.external_contributor_completed_tasks_count,
      profileSettings: model.profile_settings,
      userSetting: model.user_setting,
      trustData: model.trust_data,
      credibilityData: model.credibility_data,
      deletedAt: model.deleted_at?.toJSDate() ?? null,
      createdAt: model.created_at.toJSDate(),
      updatedAt: model.updated_at.toJSDate(),
    }
    return new UserEntity(props)
  }

  static toRecord(model: User): UserRecord {
    return {
      id: model.id,
      username: model.username,
      email: model.email,
      status: model.status,
      system_role: model.system_role,
      current_organization_id: model.current_organization_id,
      auth_method: model.auth_method,
      avatar_url: model.avatar_url,
      bio: model.bio,
      phone: model.phone,
      address: model.address,
      timezone: model.timezone,
      language: model.language,
      is_external_contributor: model.is_external_contributor,
      external_contributor_rating: model.external_contributor_rating,
      external_contributor_completed_tasks_count: model.external_contributor_completed_tasks_count,
      profile_settings: model.profile_settings,
      user_setting: model.user_setting,
      trust_data: model.trust_data,
      credibility_data: model.credibility_data,
      deleted_at: serializeDateTime(model.deleted_at),
      created_at: serializeDateTime(model.created_at),
      updated_at: serializeDateTime(model.updated_at),
    }
  }

  static toProfileRecord(
    model: User,
    currentOrganization: UserCurrentOrganizationProjection | null,
    skills: UserSkillRecord[] = []
  ): UserProfileRecord {
    return {
      ...this.toRecord(model),
      current_organization: currentOrganization
        ? {
            id: currentOrganization.id,
            name: currentOrganization.name,
            slug: currentOrganization.slug,
            logo: currentOrganization.logo,
          }
        : null,
      skills,
    }
  }

  static toSkillRecord(model: UserSkill): UserSkillRecord {
    return {
      id: model.id,
      user_id: model.user_id,
      skill_id: model.skill_id,
      verified_public_proficiency_code: model.verified_public_proficiency_code,
      total_reviews: model.total_reviews,
      avg_score: model.avg_score,
      source: model.source,
      avg_percentage: model.avg_percentage,
      last_calculated_at: model.last_calculated_at,
      last_reviewed_at: model.last_reviewed_at,
    }
  }

  /**
   * Domain Entity → ORM Entity fields (partial, for create/update)
   * Returns a plain object that can be used with Model.create() or model.merge()
   */
  static toOrm(entity: Partial<UserEntityProps>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (entity.username !== undefined) result['username'] = entity.username
    if (entity.email !== undefined) result['email'] = entity.email
    if (entity.status !== undefined) result['status'] = entity.status
    if (entity.systemRole !== undefined) result['system_role'] = entity.systemRole
    if (entity.currentOrganizationId !== undefined)
      result['current_organization_id'] = entity.currentOrganizationId
    if (entity.authMethod !== undefined) result['auth_method'] = entity.authMethod
    if (entity.avatarUrl !== undefined) result['avatar_url'] = entity.avatarUrl
    if (entity.bio !== undefined) result['bio'] = entity.bio
    if (entity.phone !== undefined) result['phone'] = entity.phone
    if (entity.address !== undefined) result['address'] = entity.address
    if (entity.timezone !== undefined) result['timezone'] = entity.timezone
    if (entity.language !== undefined) result['language'] = entity.language
    if (entity.isExternalContributor !== undefined) result['is_external_contributor'] = entity.isExternalContributor
    if (entity.externalContributorRating !== undefined) result['external_contributor_rating'] = entity.externalContributorRating
    if (entity.externalContributorCompletedTasksCount !== undefined)
      result['external_contributor_completed_tasks_count'] = entity.externalContributorCompletedTasksCount
    if (entity.profileSettings !== undefined) result['profile_settings'] = entity.profileSettings
    if (entity.userSetting !== undefined) result['user_setting'] = entity.userSetting
    if (entity.trustData !== undefined) result['trust_data'] = entity.trustData
    if (entity.credibilityData !== undefined) result['credibility_data'] = entity.credibilityData

    return result
  }
}
