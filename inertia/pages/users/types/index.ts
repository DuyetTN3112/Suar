export interface User {
  id: string
  username: string
  email: string
  system_role: string
  status: string
  organization_users?: {
    organization_id: string
    org_role: string
  }[]
  created_at?: string
}

export interface UsersProps {
  users: {
    data: User[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
  filters: {
    search?: string
    system_role?: string
    status?: string
  }
  metadata: {
    roles: { value: string; label: string }[]
    statuses: { value: string; label: string }[]
  }
}

export interface PendingApprovalProps {
  users: {
    data: User[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
  filters: {
    search?: string
    status?: string
  }
  metadata?: unknown
}
