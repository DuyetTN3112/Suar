import Project from '#modules/projects/infra/models/project-context/project'

export class LucidProjectSearchDocumentReader {
  async findProjectSearchDocumentRecord(projectId: string) {
    const project = await Project.find(projectId)
    if (!project) {
      return null
    }

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
