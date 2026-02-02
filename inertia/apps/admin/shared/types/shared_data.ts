export interface SharedAuthUser {
  realm?: 'system'
  id?: string
  username?: string
  email?: string
  system_role?: string | null
  system_permissions?: string[] | null
  avatar_url?: string | null
}

export interface SharedData {
  auth?: {
    user?: SharedAuthUser | null
  }
  context?: {
    realm?: 'system'
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
