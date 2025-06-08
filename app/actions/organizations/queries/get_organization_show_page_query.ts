import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import GetOrganizationDetailQuery from './get_organization_detail_query.js'
import GetOrganizationShowDataQuery from './get_organization_show_data_query.js'
import { GetOrganizationDetailDTO } from '../dtos/request/get_organization_detail_dto.js'

export interface OrganizationShowPageResult {
  organization: {
    id: DatabaseId
    name: string
    slug: string
    owner_id: DatabaseId
    owner?: { id: DatabaseId; email: string } | null
    stats?: {
      member_count: number
      project_count: number
      task_count: number
    }
    members_preview?: Array<{
      id: DatabaseId
      email: string
      org_role: string
      joined_at: Date
    }>
    [key: string]: unknown
  }
  members: Array<{
    id: DatabaseId
    username: string
    email: string
    org_role: string
    role_name: string
  }>
  userRole: string
}

/**
 * Composite Query: Get Organization Show Page Data
 *
 * Aggregates all data needed to render the organization show page
 * by running GetOrganizationDetailQuery and GetOrganizationShowDataQuery in parallel.
 */
export default class GetOrganizationShowPageQuery {
  constructor(protected ctx: HttpContext) {}

  async execute(organizationId: string, userId: DatabaseId): Promise<OrganizationShowPageResult> {
    const execCtx = ExecutionContext.fromHttp(this.ctx)
    const dto = new GetOrganizationDetailDTO(organizationId, true, false, false)

    const [organization, showData] = await Promise.all([
      new GetOrganizationDetailQuery(execCtx).execute(dto),
      new GetOrganizationShowDataQuery(this.ctx).execute(organizationId, userId),
    ])

    return {
      organization,
      members: showData.members,
      userRole: showData.userRole,
    }
  }
}
