/**
 * IProjectRepository — Domain Repository Interface
 *
 * Defines the contract for project data access.
 * Implementation lives in infra layer.
 * Domain layer only depends on this interface, never on the implementation.
 */

import type { ProjectEntity } from '../entities/project_entity.js'


export interface ProjectRepository {
  findById(id: string): Promise<ProjectEntity | null>
  findByOrganization(organizationId: string): Promise<ProjectEntity[]>
  findByCreator(creatorId: string): Promise<ProjectEntity[]>
  findByManager(managerId: string): Promise<ProjectEntity[]>
  findNotDeletedOrFail(id: string): Promise<ProjectEntity>
}
