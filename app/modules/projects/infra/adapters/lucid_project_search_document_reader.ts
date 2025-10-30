import type {
  ProjectSearchDocumentReader,
  ProjectSearchDocumentRecord,
} from '#modules/projects/application/ports/project_search_document_reader'
import Project from '#modules/projects/infra/models/project'

export class LucidProjectSearchDocumentReader implements ProjectSearchDocumentReader {
  async findProjectSearchDocumentRecord(projectId: string): Promise<ProjectSearchDocumentRecord> {
    const project = await Project.findOrFail(projectId)

    return {
      projectId: project.id,
      name: project.name,
      description: project.description,
      visibility: project.visibility,
      status: project.status,
      organizationId: project.organization_id,
      creatorId: project.creator_id,
      managerId: project.manager_id,
      ownerId: project.owner_id,
      tags: Array.isArray(project.tags) ? project.tags : null,
      deletedAt: project.deleted_at?.toISO() ?? null,
      updatedAt: project.updated_at.toISO() ?? new Date().toISOString(),
    }
  }
}
