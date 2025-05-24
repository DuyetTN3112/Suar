export type User = {
  id: number
  username: string
  email: string
  role: {
    id: number
    name: string
  }
  organization_role?: {
    id: number
    name: string
  }
  status: {
    id: number
    name: string
  }
  organization_users?: {
    organization_id: number
    role_id: number
    role?: {
      id: number
      name: string
    }
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
    role_id?: number
    status_id?: number
  }
  metadata: {
    roles: { id: number; name: string }[]
    statuses: { id: number; name: string }[]
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
    status_id?: number
  }
  metadata?: any
}
