/**
 * IOrganizationRepository — Domain Repository Interface
 *
 * Defines the contract for organization data access.
 * Implementation lives in infra layer.
 * Domain layer only depends on this interface, never on the implementation.
 */

import type { OrganizationEntity } from '../entities/organization_entity.js'

import type { DatabaseId } from '#types/database'

export interface OrganizationRepository {
  findById(id: DatabaseId): Promise<OrganizationEntity | null>
  findBySlug(slug: string): Promise<OrganizationEntity | null>
  findByOwnerId(ownerId: DatabaseId): Promise<OrganizationEntity[]>
  findNotDeletedOrFail(id: DatabaseId): Promise<OrganizationEntity>
}
