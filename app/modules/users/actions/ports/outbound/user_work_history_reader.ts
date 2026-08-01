export type UserWorkHistoryViewerScope = 'self' | 'public'

export interface UserOrganizationMembershipHistorySource {
  organization_id: string
  organization_name: string
  org_role: string
  joined_at: Date | string
  status: string
}

export interface UserProjectMembershipHistorySource {
  project_name: string
  organization_id: string
  project_role: string
  start_date: Date | string | null
  end_date: Date | string | null
  visibility: string
}

export interface UserOrganizationNameSource {
  id: string
  name: string
}

export abstract class UserWorkHistoryReader {
  abstract listOrganizationMemberships(
    userId: string
  ): Promise<UserOrganizationMembershipHistorySource[]>

  abstract listProjectMemberships(
    userId: string,
    viewerScope: UserWorkHistoryViewerScope
  ): Promise<UserProjectMembershipHistorySource[]>

  abstract listOrganizationNamesByIds(
    organizationIds: string[]
  ): Promise<UserOrganizationNameSource[]>
}
