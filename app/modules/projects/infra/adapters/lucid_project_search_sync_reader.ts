import type { ProjectSearchSyncReader } from '#modules/projects/application/ports/project_search_sync_reader'
import Project from '#modules/projects/infra/models/project'

export class LucidProjectSearchSyncReader implements ProjectSearchSyncReader {
  async listNotDeletedProjectIds(): Promise<string[]> {
    const projects = await Project.query().whereNull('deleted_at').select(['id'])
    return projects.map((project) => project.id)
  }
}
