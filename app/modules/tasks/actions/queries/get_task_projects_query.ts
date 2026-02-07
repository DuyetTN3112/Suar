import { DefaultTaskDependencies } from '#bootstrap/task_command_factory'
import type { DatabaseId } from '#types/database'

/**
 * Query: list projects of current organization for task scope selector.
 */
export default class GetTaskProjectsQuery {
  async execute(organizationId: DatabaseId): Promise<{ id: string; name: string }[]> {
    return DefaultTaskDependencies.project.listProjectsByOrganization(organizationId)
  }
}
