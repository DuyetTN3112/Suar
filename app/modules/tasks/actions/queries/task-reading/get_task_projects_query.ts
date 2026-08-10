import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { TaskProjectReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'

export interface GetTaskProjectsInput {
  organizationId: string
}

/**
 * Query: list projects of current organization for task scope selector.
 */
export default class GetTaskProjectsQuery extends BaseQuery<
  GetTaskProjectsInput,
  { id: string; name: string }[]
> {
  constructor(private readonly projectReader: TaskProjectReader) {
    super()
  }

  async execute(organizationId: string): Promise<{ id: string; name: string }[]> {
    return this.handle({ organizationId })
  }

  handle(input: GetTaskProjectsInput): Promise<{ id: string; name: string }[]> {
    return this.projectReader.listProjectsByOrganization(input.organizationId)
  }
}
