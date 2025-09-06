import type { TaskProjectReader } from '#modules/tasks/actions/ports/task_external_dependencies'

/**
 * Query: list projects of current organization for task scope selector.
 */
export default class GetTaskProjectsQuery {
  constructor(private projectReader: TaskProjectReader) {}

  async execute(organizationId: string): Promise<{ id: string; name: string }[]> {
    return this.projectReader.listProjectsByOrganization(organizationId)
  }
}
