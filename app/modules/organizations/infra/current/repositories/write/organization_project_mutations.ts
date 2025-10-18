import Project from '../../../../../projects/infra/models/project.js'

export interface CreateProjectData {
  name: string
  description?: string
}

export const createProject = async (
  organizationId: string,
  creatorId: string,
  data: CreateProjectData
): Promise<Project> => {
  return Project.create({
    organization_id: organizationId,
    creator_id: creatorId,
    name: data.name,
    description: data.description ?? null,
    status: 'pending',
    visibility: 'team',
    allow_external_contributors: false,
    approval_required_for_members: false,
  })
}
