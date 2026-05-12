import { BaseQuery } from '#actions/admin/base_query'
import { AdminOrganizationReadOps } from '#infra/admin/repositories/read/admin_organization_queries'
import type { ExecutionContext } from '#types/execution_context'

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const getExtrasNumber = (value: unknown, key: string): number => {
  if (typeof value !== 'object' || value === null) {
    return 0
  }
  const extras = (value as { $extras?: unknown }).$extras
  if (typeof extras !== 'object' || extras === null) {
    return 0
  }
  return toNumberValue((extras as Record<string, unknown>)[key])
}

/**
 * GetOrganizationDetailsQuery (System Admin)
 *
 * Query to get detailed information about a specific organization.
 */

export interface GetOrganizationDetailsDTO {
  organizationId: string
}

export interface OrganizationDetailsResult {
  id: string
  name: string
  slug: string
  description: string | null
  partner_type: string | null
  created_at: string
  updated_at: string
  owner: {
    id: string
    username: string
    email: string | null
  }
  stats: {
    usersCount: number
    projectsCount: number
  }
}

export default class GetOrganizationDetailsQuery extends BaseQuery<
  GetOrganizationDetailsDTO,
  OrganizationDetailsResult
> {
  constructor(
    execCtx: ExecutionContext,
    private orgRepo = AdminOrganizationReadOps
  ) {
    super(execCtx)
  }

  async handle(dto: GetOrganizationDetailsDTO): Promise<OrganizationDetailsResult> {
    const org = await this.orgRepo.findById(dto.organizationId)

    if (!org) {
      throw new Error(`Organization not found: ${dto.organizationId}`)
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      partner_type: org.partner_type,
      created_at: org.created_at.toISO() ?? new Date().toISOString(),
      updated_at: org.updated_at.toISO() ?? new Date().toISOString(),
      owner: {
        id: org.owner.id,
        username: org.owner.username,
        email: org.owner.email,
      },
      stats: {
        usersCount: getExtrasNumber(org, 'users_count'),
        projectsCount: getExtrasNumber(org, 'projects_count'),
      },
    }
  }
}
