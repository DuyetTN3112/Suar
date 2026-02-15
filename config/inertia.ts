import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import type { HttpContext } from '@adonisjs/core/http'
import type { DatabaseId } from '#types/database'

/**
 * Inertia Shared Data Config — Single Source of Truth cho frontend data
 *
 * THIẾT KẾ:
 *   - auth_middleware.ts: Authenticate + batch preload (system_role, organizations)
 *   - config/inertia.ts (file này): Serialize preloaded data → share to Svelte frontend
 *   - Dùng $preloaded check → KHÔNG re-query DB nếu auth_middleware đã load
 *
 * UUID-READY: Tất cả IDs dùng DatabaseId (string | number)
 */

// Organization type for frontend (minimal fields)
type SimpleOrganization = {
  id: DatabaseId
  name: string
  logo: string | null
  plan: string | null
}

const inertiaConfig = defineConfig({
  rootView: 'inertia_layout',

  sharedData: {
    csrfToken(ctx: HttpContext) {
      return ctx.request.csrfToken
    },

    async showOrganizationRequiredModal(ctx: HttpContext) {
      const showModal = Boolean(ctx.session.get('show_organization_required_modal', false))
      if (showModal) {
        ctx.session.forget('show_organization_required_modal')
        await ctx.session.commit()
      }
      return { showOrganizationRequiredModal: showModal }
    },

    async user(ctx: HttpContext) {
      try {
        if (await ctx.auth.check()) {
          const user = ctx.auth.user
          if (!user) {
            return { auth: { user: null } }
          }

          // Sử dụng $preloaded check — auth_middleware đã batch load
          // Chỉ load nếu chưa có (route không dùng auth middleware)
          if (!user.$preloaded.system_role) {
            await user.load('system_role')
          }
          if (!user.$preloaded.organizations) {
            await user.load('organizations')
          }

          // Role check — dùng name, không hardcode IDs
          const loadedSystemRole = user.system_role as { id: DatabaseId; name: string } | null
          const systemRoleName = loadedSystemRole?.name?.toLowerCase() ?? ''
          const isAdmin = systemRoleName === 'superadmin' || systemRoleName === 'system_admin'

          // Organization ID — session (synced by OrganizationResolver) hoặc DB
          const currentOrganizationId: DatabaseId | null =
            (ctx.session.get('current_organization_id') as DatabaseId | undefined) ??
            user.current_organization_id ??
            null

          // Serialize organizations (already preloaded)
          const organizations: SimpleOrganization[] =
            user.organizations?.map((org) => ({
              id: org.id,
              name: org.name,
              logo: org.logo || null,
              plan: org.plan || null,
            })) ?? []

          return {
            auth: {
              user: {
                id: user.id,
                email: user.email,
                username: user.username,
                system_role: loadedSystemRole
                  ? { id: loadedSystemRole.id, name: loadedSystemRole.name }
                  : null,
                system_role_id: user.system_role_id,
                isAdmin,
                current_organization_id: currentOrganizationId,
                organizations,
              },
            },
          }
        }
      } catch {
        // Auth check failed — return null user (guest)
      }

      return { auth: { user: null } }
    },
  },

  ssr: {
    enabled: false,
    entrypoint: 'inertia/app/app_svelte.ts',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {}
}
