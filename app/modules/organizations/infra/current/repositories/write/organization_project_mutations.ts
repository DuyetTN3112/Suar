import Project from '#modules/projects/infra/models/project'

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
    budget: 0,
    visibility: 'team',
    allow_freelancer: false,
    approval_required_for_members: false,
  })
}
