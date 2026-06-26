import Project from '#modules/projects/infra/models/project-context/project'

export class LucidProjectSearchSyncReader {
  async listNotDeletedProjectIds(): Promise<string[]> {
    const projects = await Project.query().whereNull('deleted_at').select(['id'])
    return projects.map((project) => project.id)
  }
}
