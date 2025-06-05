/**
 * IUserRepository — Domain Repository Interface
 *
 * Defines the contract for user data access.
 * Implementation lives in infra layer.
 * Domain layer only depends on this interface, never on the implementation.
 */

import type { UserEntity } from '../entities/user_entity.js'
import type { DatabaseId } from '#types/database'

export interface IUserRepository {
  findById(id: DatabaseId): Promise<UserEntity | null>
  findActiveOrFail(id: DatabaseId): Promise<UserEntity>
  findNotDeletedOrFail(id: DatabaseId): Promise<UserEntity>
  findByIds(ids: DatabaseId[], selectFields?: string[]): Promise<UserEntity[]>
  findByOrganization(organizationId: DatabaseId): Promise<UserEntity[]>
  findWithOrganizations(id: DatabaseId): Promise<UserEntity>
  isActive(id: DatabaseId): Promise<boolean>
  isFreelancer(id: DatabaseId): Promise<boolean>
  isSuperadmin(id: DatabaseId): Promise<boolean>
  isSystemAdmin(id: DatabaseId): Promise<boolean>
  getSystemRoleName(id: DatabaseId): Promise<string | null>
}
