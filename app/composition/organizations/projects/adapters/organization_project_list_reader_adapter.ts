import { projectsSearchComposition } from '#composition/projects/project-search/projects_search_composition'
import {
  OrganizationProjectListReader,
  type OrganizationProjectListInput,
  type OrganizationProjectListResult,
} from '#modules/organizations/actions/ports/outbound/projects/organization_project_list_reader'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


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
