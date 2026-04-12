import type { LookupListRoute } from '@adonisjs/http-server/types'

declare module '@adonisjs/http-server/types' {
  interface RoutesList {
    [method: string]: Record<string, LookupListRoute>
    GET: Record<string, LookupListRoute>
    POST: Record<string, LookupListRoute>
    PUT: Record<string, LookupListRoute>
    PATCH: Record<string, LookupListRoute>
    DELETE: Record<string, LookupListRoute>
    HEAD: Record<string, LookupListRoute>
    OPTIONS: Record<string, LookupListRoute>
    ALL: Record<string, LookupListRoute>
  }
}

declare module '@adonisjs/inertia/types' {
  interface SharedProps {
    csrfToken: string
    showOrganizationRequiredModal: boolean
    errors: Record<string, string[]>
    flash: {
      error?: string
      success?: string
    }
    auth: {
      user: {
        id: string
        email: string | null
        username: string
        avatar_url: string | null
        system_role: string
        isAdmin: boolean
        current_organization_id: string | null
        current_organization_role: string | null
        organizations: {
          id: string
          name: string
          logo: string | null
          org_role: string | null
          status: string | null
        }[]
      } | null
    }
    context: {
      canSwitchToAdmin: boolean
      isAdminMode: boolean
    }
    locale?: string
    supportedLocales?: string[]
    translations?: Record<string, Record<string, string>>
  }

  interface InertiaPages {
    [page: string]: Record<string, any>
  }
}
