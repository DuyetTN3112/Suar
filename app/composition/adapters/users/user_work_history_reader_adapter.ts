import type { AccomplishmentPublicProjectionReader } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_reader'
import { accomplishmentPublicProjectionReader } from '#modules/accomplishments/infra/repositories/publication/accomplishment_public_projection_reader'
import * as organizationWorkHistoryQueries from '#modules/organizations/infra/repositories/read/members/organization_work_history_queries'
import * as projectWorkHistoryQueries from '#modules/projects/infra/repositories/project-context/read/project_work_history_queries'
import {
  UserWorkHistoryReader,
  type UserAdminApprovedAiDemonstratedWorkSource,
  type UserDemonstratedWorkSource,
  type UserVerifiedDemonstratedWorkSource,
  type UserOrganizationMembershipHistorySource,
  type UserOrganizationNameSource,
  type UserProjectMembershipHistorySource,
  type UserWorkHistoryViewerScope,
} from '#modules/users/actions/ports/outbound/user_work_history_reader'
import * as userWorkHistoryQueries from '#modules/users/infra/repositories/read/user_work_history_queries'

export class UserWorkHistoryReaderAdapter extends UserWorkHistoryReader {
  constructor(
    private readonly publicProjectionReader: AccomplishmentPublicProjectionReader =
      accomplishmentPublicProjectionReader
  ) {
    super()
  }

  async listOrganizationMemberships(
    userId: string
  ): Promise<UserOrganizationMembershipHistorySource[]> {
    const memberships = await organizationWorkHistoryQueries.listApprovedMembershipsByUser(userId)
    return memberships.map((membership) => ({
      organization_id: membership.organization_id,
      organization_name: membership.organization_name,
      org_role: membership.org_role,
      joined_at: membership.joined_at,
      status: membership.status,
    }))
  }

  async listProjectMemberships(
    userId: string,
    viewerScope: UserWorkHistoryViewerScope
  ): Promise<UserProjectMembershipHistorySource[]> {
    const memberships = await projectWorkHistoryQueries.listMembershipsByUser(userId, {
      publicOnly: viewerScope === 'public',
    })
    return memberships.map((membership) => ({
      project_name: membership.project_name,
      organization_id: membership.organization_id,
      project_role: membership.project_role,
      start_date: membership.start_date,
      end_date: membership.end_date,
      visibility: membership.visibility,
    }))
  }

  listOrganizationNamesByIds(organizationIds: string[]): Promise<UserOrganizationNameSource[]> {
    return organizationWorkHistoryQueries.listOrganizationNamesByIds(organizationIds)
  }

  async listDemonstratedWork(
    userId: string,
    _viewerScope: UserWorkHistoryViewerScope
  ): Promise<UserDemonstratedWorkSource[]> {
    // Visibility is an application-policy decision. The repository only loads
    // storage facts; GetUserWorkHistoryQuery applies the viewer boundary.
    const rows = await userWorkHistoryQueries.listDemonstratedWorkByUser(userId)
    return rows.map((row) => ({
      task_assignment_id: row.task_assignment_id,
      task_id: row.task_id,
      task_title: row.task_title,
      task_type: row.task_type,
      business_domain: row.business_domain,
      problem_category: row.problem_category,
      role_in_task: row.role_in_task,
      collaboration_type: row.collaboration_type,
      difficulty: row.difficulty,
      overall_quality_score: row.overall_quality_score,
      was_on_time: row.was_on_time,
      completed_at: row.completed_at?.toJSDate() ?? null,
      is_public: row.is_public,
    }))
  }

  async listVerifiedDemonstratedWork(
    userId: string,
    _viewerScope: UserWorkHistoryViewerScope
  ): Promise<UserVerifiedDemonstratedWorkSource[]> {
    // Lifecycle/visibility eligibility stays in the application query, not DB
    // predicates, so public and self reads share one policy boundary.
    const rows = await userWorkHistoryQueries.listVerifiedDemonstratedWorkByUser(userId)
    return rows
  }

  async listAdminApprovedAiDemonstratedWork(
    userId: string,
    _viewerScope: UserWorkHistoryViewerScope
  ): Promise<UserAdminApprovedAiDemonstratedWorkSource[]> {
    // The repository enforces the Done gate. Visibility remains an application
    // policy decision in GetUserWorkHistoryQuery.
    return userWorkHistoryQueries.listAdminApprovedAiDemonstratedWorkByUser(userId)
  }

  async listActivePublicAccomplishmentIds(userId: string): Promise<readonly string[]> {
    const ids: string[] = []
    let cursor: string | undefined
    do {
      const page = await this.publicProjectionReader.listActiveForUser({
        userId,
        limit: 100,
        ...(cursor === undefined ? {} : { cursor }),
      })
      ids.push(...page.items.map((item) => item.accomplishmentId))
      cursor = page.nextCursor ?? undefined
    } while (cursor !== undefined)
    return ids
  }
}
