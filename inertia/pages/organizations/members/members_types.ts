export type MemberStatusFilter = 'active' | 'pending' | 'inactive'
export type MemberIncludeKey = 'activity' | 'audit'

export interface MembersFiltersState {
  search: string
  status?: MemberStatusFilter
  roleId?: string
  include: MemberIncludeKey[]
}

export interface OrganizationMember {
  id: string
  username: string
  email: string
  org_role: string
  role_name: string
  status: string
  last_activity_at?: string | null
}

export interface PendingRequest {
  user_id: string
  username: string
  email: string
  invited_by: string | null
  inviter_name: string | null
  created_at: string
}

export interface Organization {
  id: string
  name: string
  description: string | null
  logo: string | null
  website: string | null
}

export interface Role {
  value: string
  label: string
  description: string | null
}

export interface OrganizationMembersPageProps {
  organization: Organization
  members?: OrganizationMember[]
  roles: Role[]
  userRole: string
  pendingRequests?: PendingRequest[]
  filters?: MembersFiltersState
}

export function formatRequestDateTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}
