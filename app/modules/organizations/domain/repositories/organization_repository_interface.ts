/**
 * IOrganizationRepository — Domain Repository Interface
 *
 * Defines the contract for organization data access.
 * Implementation lives in infra layer.
 * Domain layer only depends on this interface, never on the implementation.
 */

import type { OrganizationEntity } from '../entities/organization_entity.js'


export interface OrganizationRepository {
  findById(id: string): Promise<OrganizationEntity | null>
  findBySlug(slug: string): Promise<OrganizationEntity | null>
  findByOwnerId(ownerId: string): Promise<OrganizationEntity[]>
  findNotDeletedOrFail(id: string): Promise<OrganizationEntity>
}
