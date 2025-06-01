export interface Organization {
  id: string
  name: string
  description: string | null
  owner_id: string
  website: string | null
  logo: string | null
  logo_url?: string | null
  plan: string | null
  slug: string
  address?: string | null
  email?: string | null
  phone?: string | null
  org_role?: string
  role_name?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  username: string
  email: string
}

export interface OrganizationUser {
  user_id: string
  organization_id: string
  org_role: string
  user: User
}

export interface UserRole {
  org_role: string
  roleName: string
}
