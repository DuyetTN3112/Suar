import ProjectRepository from '#infra/projects/repositories/project_repository'
import type { DatabaseId } from '#types/database'

/**
 * Query: list projects of current organization for task scope selector.
 */
export default class GetTaskProjectsQuery {
  async execute(organizationId: DatabaseId): Promise<Array<{ id: string; name: string }>> {
    return ProjectRepository.listSimpleByOrganization(organizationId)
  }
}
