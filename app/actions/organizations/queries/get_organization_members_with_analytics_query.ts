import { type GetOrganizationMembersDTO } from '../dtos/request/get_organization_members_dto.js'
import type { OrganizationMemberResponseDTO } from '../dtos/response/organization_response_dtos.js'

import GetOrganizationMembersQuery from './get_organization_members_query.js'

import type { ExecutionContext } from '#types/execution_context'

export interface OrganizationMembersAnalytics {
  byRole: Record<string, number>
  byStatus: Record<string, number>
  totalMembers: number
}

export interface GetOrganizationMembersWithAnalyticsResult {
  data: OrganizationMemberResponseDTO[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
  analytics: OrganizationMembersAnalytics
}

/**
 * Wrapper query that keeps existing paginated members result and adds lightweight analytics.
 * Additive only: existing list query behavior is unchanged.
 */
export default class GetOrganizationMembersWithAnalyticsQuery {
  private membersQuery: GetOrganizationMembersQuery

  constructor(execCtx: ExecutionContext) {
    this.membersQuery = new GetOrganizationMembersQuery(execCtx)
  }

  async execute(
    dto: GetOrganizationMembersDTO
  ): Promise<GetOrganizationMembersWithAnalyticsResult> {
    const result = await this.membersQuery.execute(dto)

    const byRole: Record<string, number> = {}
    const byStatus: Record<string, number> = {}

    for (const member of result.data) {
      byRole[member.org_role] = (byRole[member.org_role] ?? 0) + 1
      byStatus[member.status] = (byStatus[member.status] ?? 0) + 1
    }

    return {
      ...result,
      analytics: {
        byRole,
        byStatus,
        totalMembers: result.meta.total,
      },
    }
  }
}
