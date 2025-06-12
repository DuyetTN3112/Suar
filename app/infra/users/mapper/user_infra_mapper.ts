/**
 * UserInfraMapper — Infrastructure Layer Mapper
 *
 * Maps between ORM Entity (Lucid Model) ↔ Domain Entity.
 *
 * Flow:
 *   Read:  ORM Entity → Domain Entity
 *   Write: Domain Entity → ORM Entity (partial, for create/update)
 */

import { UserEntity } from '#domain/users/entities/user_entity'
import type { UserEntityProps } from '#domain/users/entities/user_entity'
import type User from '#models/user'

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
      isFreelancer: model.is_freelancer,
      freelancerRating: model.freelancer_rating,
      freelancerCompletedTasksCount: model.freelancer_completed_tasks_count,
      profileSettings: model.profile_settings,
      trustData: model.trust_data,
      credibilityData: model.credibility_data,
      deletedAt: model.deleted_at?.toJSDate() ?? null,
      createdAt: model.created_at.toJSDate(),
      updatedAt: model.updated_at.toJSDate(),
    }
    return new UserEntity(props)
  }

  /**
   * Domain Entity → ORM Entity fields (partial, for create/update)
   * Returns a plain object that can be used with Model.create() or model.merge()
   */
  static toOrm(entity: Partial<UserEntityProps>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (entity.username !== undefined) result.username = entity.username
    if (entity.email !== undefined) result.email = entity.email
    if (entity.status !== undefined) result.status = entity.status
    if (entity.systemRole !== undefined) result.system_role = entity.systemRole
    if (entity.currentOrganizationId !== undefined)
      result.current_organization_id = entity.currentOrganizationId
    if (entity.authMethod !== undefined) result.auth_method = entity.authMethod
    if (entity.avatarUrl !== undefined) result.avatar_url = entity.avatarUrl
    if (entity.bio !== undefined) result.bio = entity.bio
    if (entity.phone !== undefined) result.phone = entity.phone
    if (entity.address !== undefined) result.address = entity.address
    if (entity.timezone !== undefined) result.timezone = entity.timezone
    if (entity.language !== undefined) result.language = entity.language
    if (entity.isFreelancer !== undefined) result.is_freelancer = entity.isFreelancer
    if (entity.freelancerRating !== undefined) result.freelancer_rating = entity.freelancerRating
    if (entity.freelancerCompletedTasksCount !== undefined)
      result.freelancer_completed_tasks_count = entity.freelancerCompletedTasksCount
    if (entity.profileSettings !== undefined) result.profile_settings = entity.profileSettings
    if (entity.trustData !== undefined) result.trust_data = entity.trustData
    if (entity.credibilityData !== undefined) result.credibility_data = entity.credibilityData

    return result
  }
}
