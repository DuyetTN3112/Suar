import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { PageProps } from '@adonisjs/inertia/types'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import { SystemRoleName } from '#constants'

type SimpleOrganization = {
  id: string
  name: string
  logo: string | null
  plan: string | null
}

type AuthUser = {
  id: string
  email: string | null
  username: string
  system_role: string
  isAdmin: boolean
  current_organization_id: string | null
  organizations: SimpleOrganization[]
}

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async share(ctx: HttpContext): Promise<PageProps> {
    const { session, auth } = ctx as Partial<HttpContext>

    let authUser: AuthUser | null = null

    try {
      if (auth && (await auth.check())) {
        const user = auth.user
        if (user) {
          if (!user.$preloaded.organizations) {
            await user.load('organizations')
          }

          const systemRoleName = user.system_role ?? ''
          const isAdmin =
            systemRoleName === SystemRoleName.SUPERADMIN ||
            systemRoleName === SystemRoleName.SYSTEM_ADMIN

          const currentOrganizationId: string | null =
            (session?.get('current_organization_id') as string | undefined) ??
            user.current_organization_id ??
            null

          const organizations: SimpleOrganization[] =
            user.organizations?.map((org) => ({
              id: org.id,
              name: org.name,
              logo: org.logo || null,
              plan: org.plan || null,
            })) ?? []

          authUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            system_role: systemRoleName,
            isAdmin,
            current_organization_id: currentOrganizationId,
            organizations,
          }
        }
      }
    } catch {
      // Auth check failed — return null user (guest)
    }

    const showModal = Boolean(session?.get('show_organization_required_modal', false))
    if (showModal && session) {
      session.forget('show_organization_required_modal')
      await session.commit()
    }

    return {
      csrfToken: ctx.request.csrfToken,
      showOrganizationRequiredModal: showModal,
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      flash: ctx.inertia.always({
        error: session?.flashMessages.get('error'),
        success: session?.flashMessages.get('success'),
      }),
      auth: { user: authUser },
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}
