export interface SharedAuthOrganization {
  id: string
  name: string
  logo?: string | null
  org_role?: string | null
  status?: string | null
}

export interface SharedAuthProject {
  id: string
  name: string
}

export interface SharedAuthUser {
  realm?: 'user'
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
  projects?: SharedAuthProject[]
}

export interface UserWorkspaceAccess {
  realm: 'user'
  personal: {
    canEnter: true
  }
  organization: {
    id: string
    role: string | null
    canEnterManagement: boolean
  } | null
  projects: Array<SharedAuthProject & { canEnter: boolean }>
}

export interface SharedData {
  auth?: {
    user?: SharedAuthUser | null
  }
  context?: {
    realm?: 'user'
  }
  workspaceAccess?: UserWorkspaceAccess | null
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
