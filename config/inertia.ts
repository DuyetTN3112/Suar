import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import type { HttpContext } from '@adonisjs/core/http'
import { SystemRoleName } from '#constants'

/**
 * Inertia Shared Data Config — Single Source of Truth cho frontend data
 *
 * v3: system_role là inline VARCHAR trên users table.
 * Không cần preload system_role relationship.
 *
 * THIẾT KẾ:
 *   - auth_middleware.ts: Authenticate + preload organizations
 *   - config/inertia.ts (file này): Serialize data → share to Svelte frontend
 */

// Organization type for frontend (minimal fields)
type SimpleOrganization = {
  id: string
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

          // v3: system_role is inline on user — no preload needed
          // Only preload organizations if not already loaded
          if (!user.$preloaded.organizations) {
            await user.load('organizations')
          }

          // v3: read inline system_role string directly
          const systemRoleName = user.system_role ?? ''
          const isAdmin =
            systemRoleName === SystemRoleName.SUPERADMIN ||
            systemRoleName === SystemRoleName.SYSTEM_ADMIN

          // Organization ID — session (synced by OrganizationResolver) hoặc DB
          const currentOrganizationId: string | null =
            (ctx.session.get('current_organization_id') as string | undefined) ??
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
                system_role: systemRoleName,
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
