import { DateTime } from 'luxon'

export interface OrganizationMemberIdentityProjection {
  id: string
  username: string
  email: string | null
  status: string
  system_role: string
  avatar_url: string | null
  created_at: DateTime
}

export interface OrganizationMembershipProjection {
  organization_id: string
  user_id: string
  org_role: string
  status: string
  invited_by: string | null
  created_at: DateTime
  updated_at: DateTime
}

export interface OrganizationMembershipWithUserProjection
  extends OrganizationMembershipProjection {
  user: OrganizationMemberIdentityProjection
}

export interface OrganizationSummaryProjection {
  id: string
  name: string
  logo: string | null
}

export interface UserOrganizationMembershipSummaryProjection
  extends OrganizationSummaryProjection {
  slug: string
  org_role: string
  status: string
  invited_by: string | null
}

export interface OrganizationMembershipWithUserAndOrganizationProjection
  extends OrganizationMembershipWithUserProjection {
  organization: OrganizationSummaryProjection
}

export interface OrganizationInvitationProjection extends OrganizationMembershipProjection {
  organization: OrganizationSummaryProjection
  inviter: OrganizationMemberIdentityProjection
}

export function toProjectionDateTime(value: string | Date | DateTime): DateTime {
  if (DateTime.isDateTime(value)) {
    return value
  }

  return value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromISO(value)
}
