import * as organizationWorkHistoryQueries from '#modules/organizations/members/infra/repositories/read/organization_work_history_queries'
import * as projectWorkHistoryQueries from '#modules/projects/infra/repositories/read/project_work_history_queries'
import {
  UserWorkHistoryReader,
  type UserOrganizationMembershipHistorySource,
  type UserOrganizationNameSource,
  type UserProjectMembershipHistorySource,
  type UserWorkHistoryViewerScope,
} from '#modules/users/actions/ports/outbound/user_work_history_reader'

export class UserWorkHistoryReaderAdapter extends UserWorkHistoryReader {
  async listOrganizationMemberships(
    userId: string
  ): Promise<UserOrganizationMembershipHistorySource[]> {
    const memberships =
      await organizationWorkHistoryQueries.listApprovedMembershipsByUser(userId)
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

  listOrganizationNamesByIds(
    organizationIds: string[]
  ): Promise<UserOrganizationNameSource[]> {
    return organizationWorkHistoryQueries.listOrganizationNamesByIds(organizationIds)
  }
}
