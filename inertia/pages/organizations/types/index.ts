export interface Organization {
  id: number
  name: string
  description: string | null
  owner_id: number
  website: string | null
  logo: string | null
  logo_url?: string | null
  plan: string | null
  slug: string
  address?: string | null
  email?: string | null
  phone?: string | null
  role_id?: number
  role_name?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string
  username?: string
}

export interface OrganizationUser {
  user_id: number
  organization_id: number
  role_id: number
  user: User
  role: {
    id: number
    name: string
  }
}

export interface UserRole {
  roleId: number
  roleName: string
}
