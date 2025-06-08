/**
 * IProjectRepository — Domain Repository Interface
 *
 * Defines the contract for project data access.
 * Implementation lives in infra layer.
 * Domain layer only depends on this interface, never on the implementation.
 */

import type { ProjectEntity } from '../entities/project_entity.js'
import type { DatabaseId } from '#types/database'

export interface ProjectRepository {
  findById(id: DatabaseId): Promise<ProjectEntity | null>
  findByOrganization(organizationId: DatabaseId): Promise<ProjectEntity[]>
  findByCreator(creatorId: DatabaseId): Promise<ProjectEntity[]>
  findByManager(managerId: DatabaseId): Promise<ProjectEntity[]>
  findNotDeletedOrFail(id: DatabaseId): Promise<ProjectEntity>
}
