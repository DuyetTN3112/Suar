import type { JSONDataTypes } from '@adonisjs/core/types/transformers'
import type { LookupListRoute } from '@adonisjs/http-server/types'
import type { Component } from 'svelte'

type SvelteComponentPageProps<ComponentType> =
  ComponentType extends Component<infer Props> ? Props : never

type KeysOfUnion<Value> = Value extends Value ? keyof Value : never

type UnionValueAt<Value, Key extends PropertyKey> =
  Value extends Value ? (Key extends keyof Value ? Value[Key] : never) : never

type RequiredKeysAcrossUnion<Value> = {
  [Key in KeysOfUnion<Value>]: [Value] extends [Record<Key, unknown>] ? Key : never
}[KeysOfUnion<Value>]

type Jsonified<Value> =
  Value extends JSONDataTypes
    ? Value
    : Value extends (...arguments_: never[]) => unknown
      ? never
      : Value extends readonly (infer Item)[]
        ? Jsonified<Item>[]
        : Value extends object
          ? { [Key in keyof Value]: Jsonified<Value[Key]> }
          : never

type SvelteInertiaPageProps<ComponentType> = {
  [Key in RequiredKeysAcrossUnion<SvelteComponentPageProps<ComponentType>>]: Jsonified<
    UnionValueAt<SvelteComponentPageProps<ComponentType>, Key>
  >
} & {
  [Key in Exclude<
    KeysOfUnion<SvelteComponentPageProps<ComponentType>>,
    RequiredKeysAcrossUnion<SvelteComponentPageProps<ComponentType>>
  >]?: Jsonified<UnionValueAt<SvelteComponentPageProps<ComponentType>, Key>>
}

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
        user_setting: {
          theme: string
          notifications_enabled: boolean
          display_mode: string
          font: string
          layout: string
          density: string
          animations_enabled: boolean
          custom_scrollbars: boolean
        }
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
    'admin/audit_logs/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/audit_logs/index.svelte').default>
    'admin/dashboard': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/dashboards/index.svelte').default>
    'admin/dashboards/operations': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/dashboards/operations.svelte').default>
    'admin/dashboards/subscriptions': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/dashboards/subscriptions.svelte').default>
    'admin/dashboards/users': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/dashboards/users.svelte').default>
    'admin/disputes/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/disputes/index.svelte').default>
    'admin/disputes/show': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/disputes/show.svelte').default>
    'admin/proficiency/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/proficiency/index.svelte').default>
    'admin/proficiency/rubric': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/proficiency/rubric.svelte').default>
    'admin/proficiency/show': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/proficiency/show.svelte').default>
    'admin/organizations/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/organizations/index.svelte').default>
    'admin/organizations/show': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/organizations/show.svelte').default>
    'admin/packages/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/packages/index.svelte').default>
    'admin/permissions/custom_roles/create': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/permissions/custom_roles/create.svelte').default>
    'admin/permissions/custom_roles/edit': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/permissions/custom_roles/edit.svelte').default>
    'admin/permissions/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/permissions/index.svelte').default>
    'admin/permissions/organization': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/permissions/organization.svelte').default>
    'admin/permissions/project': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/permissions/project.svelte').default>
    'admin/permissions/system': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/permissions/system.svelte').default>
    'admin/qr_codes/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/qr_codes/index.svelte').default>
    'admin/reviews/flagged': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/reviews/flagged.svelte').default>
    'admin/reviews/show': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/reviews/show.svelte').default>
    'admin/users/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/users/index.svelte').default>
    'admin/users/show': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/users/show.svelte').default>
    'applications/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/applications/index.svelte').default>
    'applications/my-applications': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/applications/my-applications.svelte').default | typeof import('../inertia/apps/org/modules/applications/my-applications.svelte').default>
    'auth/login': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/auth/login.svelte').default | typeof import('../inertia/apps/org/modules/auth/login.svelte').default>
    'errors/custom_error': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/errors/custom_error.svelte').default | typeof import('../inertia/apps/user/modules/errors/custom_error.svelte').default | typeof import('../inertia/apps/org/modules/errors/custom_error.svelte').default>
    'errors/forbidden': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/errors/forbidden.svelte').default | typeof import('../inertia/apps/user/modules/errors/forbidden.svelte').default | typeof import('../inertia/apps/org/modules/errors/forbidden.svelte').default>
    'errors/not_found': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/errors/not_found.svelte').default | typeof import('../inertia/apps/user/modules/errors/not_found.svelte').default | typeof import('../inertia/apps/org/modules/errors/not_found.svelte').default>
    'errors/require_organization': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/errors/require_organization.svelte').default | typeof import('../inertia/apps/user/modules/errors/require_organization.svelte').default | typeof import('../inertia/apps/org/modules/errors/require_organization.svelte').default>
    'errors/server_error': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/errors/server_error.svelte').default | typeof import('../inertia/apps/user/modules/errors/server_error.svelte').default | typeof import('../inertia/apps/org/modules/errors/server_error.svelte').default>
    index: SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/dashboard/index.svelte').default>
    'marketplace/tasks': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/marketplace/tasks.svelte').default | typeof import('../inertia/apps/org/modules/marketplace/tasks.svelte').default>
    'org/marketplace/tasks': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/marketplace/tasks.svelte').default>
    'notifications/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/notifications/index.svelte').default | typeof import('../inertia/apps/user/modules/notifications/index.svelte').default | typeof import('../inertia/apps/org/modules/notifications/index.svelte').default>
    'org/bookmarks/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/bookmarks/index.svelte').default>
    'org/audit_logs/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/audit_logs/index.svelte').default>
    'org/dashboard': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/dashboard/index.svelte').default>
    'org/departments/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/departments/index.svelte').default>
    'org/invitations/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/invitations/index.svelte').default>
    'org/invitations/requests': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/invitations/requests.svelte').default>
    'org/members/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/members/index.svelte').default>
    'org/no_org': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/no_org.svelte').default>
    'org/permissions/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/permissions/index.svelte').default>
    'org/projects/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/projects/index.svelte').default>
    'org/roles/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/roles/index.svelte').default>
    'org/settings/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/settings/index.svelte').default>
    'org/sprints/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/sprints/index.svelte').default>
    'org/talents/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/talents/index.svelte').default>
    'org/talents/show': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/talents/show.svelte').default>
    'org/workflow/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/workflow/index.svelte').default>
    'organizations/all': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/organizations/all.svelte').default | typeof import('../inertia/apps/org/modules/organizations/all.svelte').default>
    'organizations/create': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/organizations/create.svelte').default | typeof import('../inertia/apps/org/modules/organizations/create.svelte').default>
    'organizations/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/organizations/index.svelte').default | typeof import('../inertia/apps/user/modules/organizations/index.svelte').default | typeof import('../inertia/apps/org/modules/organizations/index.svelte').default>
    'organizations/show': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/organizations/show.svelte').default | typeof import('../inertia/apps/user/modules/organizations/show.svelte').default | typeof import('../inertia/apps/org/modules/organizations/show.svelte').default>
    'profile/edit': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/profile/edit.svelte').default | typeof import('../inertia/apps/org/modules/profile/edit.svelte').default>
    'profile/invitations': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/profile/invitations.svelte').default | typeof import('../inertia/apps/org/modules/profile/invitations.svelte').default>
    'profile/public_snapshot': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/profile/public_snapshot.svelte').default>
    'profile/show': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/profile/show.svelte').default | typeof import('../inertia/apps/org/modules/profile/show.svelte').default>
    'profile/snapshots': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/profile/snapshots.svelte').default>
    'profile/view': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/profile/view.svelte').default | typeof import('../inertia/apps/org/modules/profile/view.svelte').default>
    'projects/create': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/projects/create.svelte').default | typeof import('../inertia/apps/org/modules/projects/create.svelte').default>
    'projects/index': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/projects/index.svelte').default | typeof import('../inertia/apps/org/modules/projects/index.svelte').default>
    'projects/show': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/projects/show.svelte').default | typeof import('../inertia/apps/org/modules/projects/show.svelte').default>
    'reviews/flagged': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/reviews/flagged.svelte').default>
    'reviews/show': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/reviews/show.svelte').default>
    'reviews/sprint-reverse-board': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/reviews/sprint-reverse-board.svelte').default>
    'reviews/task-board': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/reviews/task-board.svelte').default>
    'reviews/user-reviews': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/reviews/user-reviews.svelte').default | typeof import('../inertia/apps/org/modules/reviews/user-reviews.svelte').default>
    'search/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/search/index.svelte').default | typeof import('../inertia/apps/user/modules/search/index.svelte').default | typeof import('../inertia/apps/org/modules/search/index.svelte').default>
    'settings/account': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/settings/account.svelte').default | typeof import('../inertia/apps/org/modules/settings/account.svelte').default>
    'settings/audit_logs': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/settings/audit_logs.svelte').default | typeof import('../inertia/apps/org/modules/settings/audit_logs.svelte').default>
    'talents/index': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/talents/index.svelte').default>
    'talents/show': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/talents/show.svelte').default>
    'settings/index': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/settings/index.svelte').default | typeof import('../inertia/apps/org/modules/settings/index.svelte').default>
    'settings/notifications': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/settings/notifications.svelte').default | typeof import('../inertia/apps/org/modules/settings/notifications.svelte').default>
    'settings/profile': SvelteInertiaPageProps<typeof import('../inertia/apps/org/modules/settings/profile.svelte').default>
    'tasks/applications': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/tasks/applications.svelte').default | typeof import('../inertia/apps/org/modules/tasks/applications.svelte').default>
    'tasks/create': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/tasks/create.svelte').default | typeof import('../inertia/apps/org/modules/tasks/create.svelte').default>
    'tasks/edit': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/tasks/edit.svelte').default | typeof import('../inertia/apps/org/modules/tasks/edit.svelte').default>
    'tasks/index': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/tasks/index.svelte').default | typeof import('../inertia/apps/org/modules/tasks/index.svelte').default>
    'tasks/show': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/tasks/show.svelte').default | typeof import('../inertia/apps/org/modules/tasks/show.svelte').default>
    'users/index': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/users/index.svelte').default>
    'users/show': SvelteInertiaPageProps<typeof import('../inertia/apps/admin/modules/users/show.svelte').default>
    'work/index': SvelteInertiaPageProps<typeof import('../inertia/apps/user/modules/work/index.svelte').default>
  }
}
