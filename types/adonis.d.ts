import type { LookupListRoute } from '@adonisjs/http-server/types'

declare module '@adonisjs/http-server/types' {
  interface RoutesList {
    [method: string]: { [identifier: string]: LookupListRoute }
    GET: { [key: string]: LookupListRoute }
    POST: { [key: string]: LookupListRoute }
    PUT: { [key: string]: LookupListRoute }
    PATCH: { [key: string]: LookupListRoute }
    DELETE: { [key: string]: LookupListRoute }
    HEAD: { [key: string]: LookupListRoute }
    OPTIONS: { [key: string]: LookupListRoute }
    ALL: { [key: string]: LookupListRoute }
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
        organizations: Array<{
          id: string
          name: string
          logo: string | null
          org_role: string | null
          status: string | null
        }>
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
    // Keep page contracts permissive until generated contracts are wired reliably.
    [key: string]: Record<string, any>
  }
}
