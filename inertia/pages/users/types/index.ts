export type User = {
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

export type UsersProps = {
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

export type PendingApprovalProps = {
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
