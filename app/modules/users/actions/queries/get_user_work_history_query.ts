import { BaseQuery } from '#modules/users/actions/base_query'
import * as userAnalyticsQueries from '#modules/users/infra/repositories/read/analytics_queries'
import type { OrgMembershipRow, ProjectMembershipRow } from '#modules/users/infra/repositories/read/analytics_queries'

export interface OrgMembershipItem {
  org_name: string
  org_role: string
  joined_at: string
  status: string
}

export interface ProjectMembershipItem {
  project_name: string
  org_name: string | null
  project_role: string
  start_date: string | null
  end_date: string | null
  visibility: string
}

export interface WorkHistoryResult {
  organizations: OrgMembershipItem[]
  projects: ProjectMembershipItem[]
}

export class GetUserWorkHistoryDTO {
  declare user_id: string

  constructor(userId: string) {
    this.user_id = userId
  }
}

function formatDate(value: Date | string | null): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short' })
}

export default class GetUserWorkHistoryQuery extends BaseQuery<
  GetUserWorkHistoryDTO,
  WorkHistoryResult
> {
  async handle(dto: GetUserWorkHistoryDTO): Promise<WorkHistoryResult> {
    const cacheKey = `users:work_history:${dto.user_id}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      const [orgRows, projectRows] = await Promise.all([
        userAnalyticsQueries.findUserOrgMemberships(dto.user_id),
        userAnalyticsQueries.findUserProjectMemberships(dto.user_id),
      ])

      const organizations: OrgMembershipItem[] = orgRows.map((row: OrgMembershipRow) => ({
        org_name: row.org_name,
        org_role: row.org_role,
        joined_at: formatDate(row.joined_at) ?? '',
        status: row.status,
      }))

      const projects: ProjectMembershipItem[] = projectRows.map((row: ProjectMembershipRow) => ({
        project_name: row.project_name,
        org_name: row.org_name,
        project_role: row.project_role,
        start_date: formatDate(row.start_date),
        end_date: formatDate(row.end_date),
        visibility: row.visibility,
      }))

      return { organizations, projects }
    })
  }
}
