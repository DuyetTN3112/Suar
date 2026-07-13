import type { ProjectSearchDocumentReader } from '#modules/search/actions/ports/outbound/project_search_document_reader'
import type { ProjectSearchDocument } from '#modules/search/domain/entity-search/project_search_document'

export class ProjectSearchDocumentBuilder {
  constructor(
    private readonly projectSearchDocumentReader: ProjectSearchDocumentReader
  ) {}

  async build(projectId: string): Promise<ProjectSearchDocument | null> {
    const project =
      await this.projectSearchDocumentReader.findProjectSearchDocumentRecord(projectId)
    if (!project) {
      return null
    }
    const tags = Array.isArray(project.tags) ? project.tags : []

    return {
      project_id: project.projectId,
      name: project.name,
      description: project.description,
      visibility:
        project.visibility === 'public' ||
        project.visibility === 'private' ||
        project.visibility === 'team'
          ? project.visibility
          : 'private',
      status: project.status,
      organization_id: project.organizationId ?? '',
      creator_id: project.creatorId ?? '',
      manager_id: project.managerId,
      owner_id: project.ownerId,
      tags_text: tags.map((tag) => String(tag)).join(' '),
      deleted_at: project.deletedAt,
      updated_at: project.updatedAt,
    }
  }
}
