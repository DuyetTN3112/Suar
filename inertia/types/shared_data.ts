export interface SharedAuthOrganization {
  id: string
  name: string
  logo?: string | null
  org_role?: string | null
  status?: string | null
}

export interface SharedAuthUser {
  id?: string
  username?: string
  email?: string
  avatar_url?: string | null
  current_organization_id?: string | null
  current_organization_role?: string | null
  organizations?: SharedAuthOrganization[]
  current_project?: {
    id?: string
    name: string
  } | null
}

export interface SharedData {
  auth?: {
    user?: SharedAuthUser | null
  }
  context?: {
    canSwitchToAdmin?: boolean
    isAdminMode?: boolean
  }
  flash?: {
    success?: string
    error?: string
  }
  csrfToken?: string
  locale?: string
  supportedLocales?: string[]
  translations?: Record<string, unknown>
  errors?: Record<string, string[]>
  [key: string]: unknown
}
