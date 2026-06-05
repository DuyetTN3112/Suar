export interface OrganizationProjectListInput {
  organizationId: string
  actorId: string
  page: number
  perPage: number
  search?: string
  status?: string
}

export interface OrganizationProjectListResult {
  projects: {
    id: string
    name: string
    description: string | null
    status: string
    createdAt: string
    memberCount: number
    taskCount: number
  }[]
  total: number
}

export abstract class OrganizationProjectListReader {
  abstract list(input: OrganizationProjectListInput): Promise<OrganizationProjectListResult>
}
