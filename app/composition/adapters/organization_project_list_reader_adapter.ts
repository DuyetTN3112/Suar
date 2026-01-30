import { projectsSearchComposition } from '#composition/projects_search_composition'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import {
  OrganizationProjectListReader,
  type OrganizationProjectListInput,
  type OrganizationProjectListResult,
} from '#modules/organizations/projects/actions/ports/outbound/organization_project_list_reader'

interface ProjectListProjection {
  id: string
  name: string
  description: string | null
  status: string
  created_at: Date | string
  member_count?: number
  task_count?: number
}

const isProjectListProjection = (value: unknown): value is ProjectListProjection => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const row = value as Record<string, unknown>
  return (
    typeof row['id'] === 'string' &&
    typeof row['name'] === 'string' &&
    (typeof row['description'] === 'string' || row['description'] === null) &&
    typeof row['status'] === 'string' &&
    (row['created_at'] instanceof Date || typeof row['created_at'] === 'string')
  )
}

export class OrganizationProjectListReaderAdapter extends OrganizationProjectListReader {
  async list(input: OrganizationProjectListInput): Promise<OrganizationProjectListResult> {
    const result = await projectsSearchComposition.listProjects(
      omitUndefined({
        organization_id: input.organizationId,
        page: input.page,
        limit: input.perPage,
        search: input.search,
        status: input.status,
      }),
      {
        userId: input.actorId,
        organizationId: input.organizationId,
        ip: '0.0.0.0',
        userAgent: 'organization-project-list',
      }
    )

    return {
      projects: result.data.filter(isProjectListProjection).map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt:
          project.created_at instanceof Date
            ? project.created_at.toISOString()
            : new Date(project.created_at).toISOString(),
        memberCount: project.member_count ?? 0,
        taskCount: project.task_count ?? 0,
      })),
      total: result.pagination.total,
    }
  }
}
