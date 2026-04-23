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
  type KnownInertiaPageProps = Record<string, any>

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
    'admin/audit_logs/index': KnownInertiaPageProps
    'admin/dashboard': KnownInertiaPageProps
    'admin/dashboards/operations': KnownInertiaPageProps
    'admin/dashboards/subscriptions': KnownInertiaPageProps
    'admin/dashboards/users': KnownInertiaPageProps
    'admin/organizations/index': KnownInertiaPageProps
    'admin/organizations/show': KnownInertiaPageProps
    'admin/packages/index': KnownInertiaPageProps
    'admin/permissions/index': KnownInertiaPageProps
    'admin/qr_codes/index': KnownInertiaPageProps
    'admin/reviews/flagged': KnownInertiaPageProps
    'admin/reviews/show': KnownInertiaPageProps
    'admin/users/index': KnownInertiaPageProps
    'admin/users/show': KnownInertiaPageProps
    'applications/my-applications': KnownInertiaPageProps
    'auth/login': KnownInertiaPageProps
    'errors/custom_error': KnownInertiaPageProps
    'errors/forbidden': KnownInertiaPageProps
    'errors/not_found': KnownInertiaPageProps
    'errors/require_organization': KnownInertiaPageProps
    'errors/server_error': KnownInertiaPageProps
    index: KnownInertiaPageProps
    'marketplace/tasks': KnownInertiaPageProps
    'notifications/index': KnownInertiaPageProps
    'org/dashboard': KnownInertiaPageProps
    'org/departments/index': KnownInertiaPageProps
    'org/invitations/index': KnownInertiaPageProps
    'org/invitations/requests': KnownInertiaPageProps
    'org/members/index': KnownInertiaPageProps
    'org/no_org': KnownInertiaPageProps
    'org/permissions/index': KnownInertiaPageProps
    'org/projects/index': KnownInertiaPageProps
    'org/roles/index': KnownInertiaPageProps
    'org/settings/index': KnownInertiaPageProps
    'org/workflow/index': KnownInertiaPageProps
    'organizations/all': KnownInertiaPageProps
    'organizations/create': KnownInertiaPageProps
    'organizations/index': KnownInertiaPageProps
    'organizations/members/index': KnownInertiaPageProps
    'organizations/members/pending_requests': KnownInertiaPageProps
    'organizations/organization-debug': KnownInertiaPageProps
    'organizations/show': KnownInertiaPageProps
    'profile/edit': KnownInertiaPageProps
    'profile/show': KnownInertiaPageProps
    'profile/view': KnownInertiaPageProps
    'projects/create': KnownInertiaPageProps
    'projects/index': KnownInertiaPageProps
    'projects/show': KnownInertiaPageProps
    'reviews/flagged': KnownInertiaPageProps
    'reviews/my-reviews': KnownInertiaPageProps
    'reviews/pending': KnownInertiaPageProps
    'reviews/show': KnownInertiaPageProps
    'reviews/user-reviews': KnownInertiaPageProps
    'settings/AccountTab': KnownInertiaPageProps
    'settings/AppearanceTab': KnownInertiaPageProps
    'settings/NotificationsTab': KnownInertiaPageProps
    'settings/ProfileTab': KnownInertiaPageProps
    'settings/account': KnownInertiaPageProps
    'settings/appearance': KnownInertiaPageProps
    'settings/display': KnownInertiaPageProps
    'settings/index': KnownInertiaPageProps
    'settings/notifications': KnownInertiaPageProps
    'settings/profile': KnownInertiaPageProps
    'tasks/applications': KnownInertiaPageProps
    'tasks/create': KnownInertiaPageProps
    'tasks/edit': KnownInertiaPageProps
    'tasks/index': KnownInertiaPageProps
    'tasks/show': KnownInertiaPageProps
    'tasks/status_board': KnownInertiaPageProps
    'users/create': KnownInertiaPageProps
    'users/edit': KnownInertiaPageProps
    'users/index': KnownInertiaPageProps
    'users/pending_approval': KnownInertiaPageProps
    'users/show': KnownInertiaPageProps
  }
}
