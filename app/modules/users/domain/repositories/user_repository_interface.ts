/**
 * IUserRepository — Domain Repository Interface
 *
 * Defines the contract for user data access.
 * Implementation lives in infra layer.
 * Domain layer only depends on this interface, never on the implementation.
 */

import type { UserEntity } from '../entities/user_entity.js'


export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>
  findActiveOrFail(id: string): Promise<UserEntity>
  findNotDeletedOrFail(id: string): Promise<UserEntity>
  findByIds(ids: string[], selectFields?: string[]): Promise<UserEntity[]>
  findByOrganization(organizationId: string): Promise<UserEntity[]>
  findWithOrganizations(id: string): Promise<UserEntity>
  isActive(id: string): Promise<boolean>
  isFreelancer(id: string): Promise<boolean>
  isSuperadmin(id: string): Promise<boolean>
  isSystemAdmin(id: string): Promise<boolean>
  getSystemRoleName(id: string): Promise<string | null>
}
